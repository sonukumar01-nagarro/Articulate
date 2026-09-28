import { afterNextRender, computed, DestroyRef, effect, inject, Injectable, SecurityContext, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Article, Author } from '../catalog/catalog';
import { Session } from './session';
import { FirestoreService } from './firestore.service';
import { PostInput, SavedPost } from './content-models';
import { hasStoryContent, storyExceedsSizeLimit } from './story-content';
export type { PostInput, PostStatus, SavedPost } from './content-models';

@Injectable({ providedIn: 'root' })
export class PublishingStore {
  private readonly session = inject(Session);
  private readonly database = inject(FirestoreService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserReady = signal(false);
  private readonly published = signal<SavedPost[]>([]);
  private readonly owned = signal<SavedPost[]>([]);
  readonly publicReady = signal(false);
  readonly ready = signal(false);
  readonly publicError = signal('');
  readonly notice = signal('');
  readonly articles = computed<Article[]>(() => this.published().map((post) => this.toArticle(post)));
  readonly authors = computed<Author[]>(() => {
    const authors = new Map<string, Author>();
    for (const post of [...this.published()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))) {
      authors.set(post.authorId, {
        id: post.authorId, name: post.authorName,
        bio: post.bio.trim() || 'An Articulate contributor sharing ideas and new perspectives.',
        image: post.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80',
      });
    }
    return [...authors.values()];
  });
  readonly myPosts = computed(() => this.owned().filter((post) => post.ownerId === this.session.user()?.uid)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  readonly myDrafts = computed(() => this.myPosts().filter((post) => post.status === 'draft'));

  constructor() {
    afterNextRender(() => {
      this.browserReady.set(true);
      this.destroyRef.onDestroy(this.database.watchPublished((posts) => {
        this.published.set(posts);
        this.publicError.set('');
        this.publicReady.set(true);
      }, () => {
        this.published.set([]);
        this.publicError.set('Stories could not be loaded from Firestore. Check your connection and reload.');
        this.publicReady.set(true);
      }));
    });
    effect((onCleanup) => {
      const uid = this.session.user()?.uid;
      if (!this.browserReady() || !this.session.ready()) return;
      this.owned.set([]);
      this.notice.set('');
      this.ready.set(!uid);
      if (!uid) return;
      let active = true;
      const unsubscribe = this.database.watchOwned(uid, (posts) => {
        if (!active) return;
        this.owned.set(posts);
        this.ready.set(true);
      }, () => {
        if (!active) return;
        this.owned.set([]);
        this.notice.set('Your posts could not be loaded from Firestore. Check your connection and reload.');
        this.ready.set(true);
      });
      onCleanup(() => { active = false; unsubscribe(); });
    });
  }

  findDraft(id: string): SavedPost | undefined {
    return this.myDrafts().find((post) => post.id === id);
  }

  async loadDraft(id: string): Promise<SavedPost | undefined> {
    const uid = this.session.user()?.uid;
    if (!uid) return undefined;
    // The owned-posts listener can lag behind a confirmed save.
    const draft = await this.database.getDraft(id, uid);
    return this.session.user()?.uid === uid ? draft : undefined;
  }

  async saveDraft(input: PostInput): Promise<SavedPost | undefined> {
    this.notice.set('');
    const user = this.session.user();
    const body = this.sanitizer.sanitize(SecurityContext.HTML, input.body) ?? '';
    if (storyExceedsSizeLimit(body)) {
      this.notice.set('This story exceeds 500 KB. Remove an image or use smaller images before saving.');
      return undefined;
    }
    if (!user || !this.ready() || !input.title.trim() || !input.summary.trim() ||
      !input.category.trim() || !hasStoryContent(body)) return undefined;
    try {
      return await this.database.saveDraft({
        title: input.title.trim(), summary: input.summary.trim(), category: input.category.trim(),
        bio: input.bio.trim(), body, thumbnail: input.thumbnail?.trim() || '', ownerId: user.uid, authorId: user.uid,
        authorName: user.displayName?.trim() || 'Articulate contributor', photo: user.photoURL,
        status: 'draft', updatedAt: new Date().toISOString(),
      }, input.id);
    } catch {
      this.notice.set('Draft could not be saved to Firestore. Your text is still here; try again.');
      return undefined;
    }
  }

  async publishDraft(id: string): Promise<Article | undefined> {
    const user = this.session.user();
    if (!user) return undefined;
    try {
      const post = await this.database.publishDraft(id, user.uid);
      return this.toArticle(post);
    } catch {
      this.notice.set('Publishing failed. Your saved draft is available to retry.');
      return undefined;
    }
  }

  private toArticle(post: SavedPost): Article {
    return {
      id: post.id, title: post.title, description: post.summary,
      author: post.authorName, authorId: post.authorId, publishedAt: post.updatedAt.slice(0, 10),
      category: post.category,
      thumbnail: post.thumbnail || 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85',
      views: 0, content: [this.textFrom(post.body)], htmlContent: post.body,
    };
  }

  private textFrom(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
