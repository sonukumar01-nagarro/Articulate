import { Component, computed, effect, ElementRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TextEditor } from './text-editor';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Session } from '../shared/session';
import { PostInput, PublishingStore, SavedPost } from '../shared/publishing-store';
import { SiteHeader } from '../shared/site-header';
import { FormFeedback } from '../shared/form-feedback';
import { FormValidation } from '../shared/form-validation';
import { hasStoryContent, storyExceedsSizeLimit } from '../shared/story-content';

@Component({
  selector: 'app-post-editor',
  imports: [FormsModule, RouterLink, TextEditor, ButtonModule, InputTextModule, TextareaModule, SiteHeader],
  templateUrl: './post-editor.html',
})
export class PostEditor {
  protected readonly session = inject(Session);
  protected readonly store = inject(PublishingStore);
  private readonly route = toSignal(inject(ActivatedRoute).paramMap);
  private readonly router = inject(Router);

  protected readonly initialized = computed(() => this.session.ready() && this.store.ready());
  protected title = '';
  protected summary = '';
  protected category = 'Ideas';
  protected bio = '';
  protected body = '';
  protected thumbnail = '';
  protected draftId: string | null = null;
  private readonly feedback = inject(FormFeedback);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly validation = new FormValidation();
  protected saving = signal(false);
  protected readonly imageProcessing = signal(false);
  protected readonly loadingDraft = signal(false);
  private loadedId = '';
  private loadedOwner: string | null = null;

  constructor() {
    effect((onCleanup) => {
      let active = true;
      onCleanup(() => { active = false; });
      const owner = this.session.user()?.uid ?? null;
      if (owner !== this.loadedOwner) {
        this.loadedOwner = owner;
        this.loadedId = '';
        this.title = this.summary = this.bio = this.body = this.thumbnail = '';
        this.draftId = null;
        this.validation.reset();
        this.loadingDraft.set(false);
      }
      if (!this.initialized()) return;
      const id = this.route()?.get('id') ?? null;
      const key = id ?? 'new';
      if (this.loadedId === key) return;
      this.validation.reset();
      this.draftId = id;
      if (id) {
        const draft = this.store.findDraft(id);
        if (draft) {
          this.loadFields(draft);
          this.loadingDraft.set(false);
          return;
        }
        this.loadingDraft.set(true);
        void this.store.loadDraft(id).then((saved) => {
          if (!active) return;
          if (saved) this.loadFields(saved);
          else this.feedback.show('That draft was not found in your account.');
        }).catch(() => {
          if (active) this.feedback.show('The draft could not be loaded. Check your connection and reload.');
        }).finally(() => {
          if (active) this.loadingDraft.set(false);
        });
      } else {
        this.loadedId = key;
        this.loadingDraft.set(false);
        this.title = '';
        this.summary = '';
        this.category = 'Ideas';
        this.bio = '';
        this.body = '';
        this.thumbnail = '';
      }
    });
    effect(() => {
      const notice = this.store.notice();
      if (notice) this.feedback.show(notice);
    });
  }

  private loadFields(draft: SavedPost): void {
    this.loadedId = draft.id;
    this.title = draft.title;
    this.summary = draft.summary;
    this.category = draft.category;
    this.bio = draft.bio;
    this.body = draft.body;
    this.thumbnail = draft.thumbnail ?? '';
  }

  private errors(): Record<string, string> {
    let thumbnailError = '';
    if (this.thumbnail.trim()) {
      try {
        const url = new URL(this.thumbnail.trim());
        if (url.protocol !== 'https:' || url.username || url.password || this.thumbnail.trim().length > 2048) throw new Error('Invalid URL');
      } catch { thumbnailError = 'Enter a valid HTTPS image URL (up to 2,048 characters).'; }
    }
    return {
      title: !this.title.trim() ? 'Enter a title.' : this.title.length > 140 ? 'Use 140 characters or fewer.' : '',
      summary: !this.summary.trim() ? 'Enter a short description.' : this.summary.length > 260 ? 'Use 260 characters or fewer.' : '',
      category: !this.category.trim() ? 'Enter a category.' : this.category.length > 48 ? 'Use 48 characters or fewer.' : '',
      bio: this.bio.length > 240 ? 'Use 240 characters or fewer.' : '',
      body: !hasStoryContent(this.body) ? 'Write some story text or add an image.' :
        storyExceedsSizeLimit(this.body) ? 'This story exceeds 500 KB. Remove an image or use smaller images before saving.' : '',
      thumbnail: thumbnailError,
    };
  }

  protected fieldError(field: string): string {
    return this.validation.show(field, this.errors()[field]);
  }

  private validate(): boolean {
    this.validation.submit();
    const first = Object.keys(this.errors()).find(field => this.errors()[field]);
    if (!first) return true;
    this.element.nativeElement.querySelector<HTMLElement>(first === 'body' ? '.ql-editor' : `[name="${first}"]`)?.focus();
    return false;
  }

  protected formData(): PostInput {
    return {
      id: this.draftId ?? undefined,
      title: this.title,
      summary: this.summary,
      category: this.category,
      bio: this.bio,
      body: this.body,
      thumbnail: this.thumbnail,
    };
  }

  protected async saveDraft(): Promise<void> {
    if (this.saving() || this.imageProcessing()) return;
    if (!this.validate()) return;
    this.saving.set(true);
    this.feedback.clear();
    try {
      const draft = await this.store.saveDraft(this.formData());
      if (!draft) {
        this.feedback.show(this.store.notice() || 'Your draft could not be saved. Please try again.');
        return;
      }
      this.draftId = draft.id;
      this.loadedId = draft.id;
      this.feedback.show('Draft saved. You can return to it any time.', 'success');
      await this.router.navigate(['/author/posts', draft.id, 'edit'], { replaceUrl: !this.route()?.get('id') });
    } catch {
      this.feedback.show('Your draft could not be saved. Your text is still here; please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async publish(): Promise<void> {
    if (this.saving() || this.imageProcessing() || !this.draftId) return;
    if (!this.validate()) return;
    this.saving.set(true);
    this.feedback.clear();
    try {
      const draft = await this.store.saveDraft(this.formData());
      if (!draft) {
        this.feedback.show(this.store.notice() || 'Your draft could not be saved before publishing. Please try again.');
        return;
      }
      const article = await this.store.publishDraft(draft.id);
      if (!article) {
        this.feedback.show(this.store.notice() || 'This draft could not be published. Try again.');
        return;
      }
      this.feedback.show('Your story has been published.', 'success');
      await this.router.navigate(['/articles', article.id]);
    } catch {
      this.feedback.show('This draft could not be published. Your saved draft is available to retry.');
    } finally {
      this.saving.set(false);
    }
  }
}
