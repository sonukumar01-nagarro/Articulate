import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { afterNextRender, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Session } from '../shared/session';
import { ArticleComment, CommentStore } from './comment-store';

type CommentSort = 'newest' | 'oldest' | 'liked';

@Component({
  selector: 'app-comments',
  providers: [CommentStore],
  imports: [DatePipe, NgTemplateOutlet, FormsModule, RouterLink, AvatarModule, ButtonModule, SelectModule, TextareaModule],
  templateUrl: './comments.html',
})
export class Comments {
  readonly articleId = input.required<string>();
  protected readonly store = inject(CommentStore);
  protected readonly session = inject(Session);
  protected readonly articleComments = computed(() => this.store.comments().filter((comment) => comment.articleId === this.articleId()));
  protected draft = '';
  protected replyDraft = '';
  protected replyTo: string | null = null;
  protected status = '';
  protected sort: CommentSort = 'newest';
  protected readonly sorts = [
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Most liked', value: 'liked' },
  ];

  private readonly browserReady = signal(false);

  constructor() {
    afterNextRender(() => this.browserReady.set(true));
    effect((onCleanup) => {
      if (this.browserReady()) onCleanup(this.store.watch(this.articleId()));
    });
  }

  protected children(parentId: string | null): ArticleComment[] {
    return this.articleComments().filter((comment) => comment.parentId === parentId).sort((a, b) => {
      const dateDifference = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (this.sort === 'liked') return b.likedBy.length - a.likedBy.length || dateDifference;
      return this.sort === 'oldest' ? -dateDifference : dateDifference;
    });
  }

  protected liked(comment: ArticleComment): boolean {
    const user = this.session.user();
    return !!user && comment.likedBy.includes(user.uid);
  }

  protected startReply(id: string): void {
    this.replyTo = id;
    this.replyDraft = '';
    this.status = '';
  }

  protected async post(parentId: string | null = null): Promise<void> {
    const text = parentId ? this.replyDraft : this.draft;
    if (!await this.store.add(this.articleId(), text, parentId)) {
      this.status = this.store.notice() || 'Unable to post. Sign in and enter a comment of up to 3,000 characters.';
      return;
    }
    if (parentId) {
      this.replyTo = null;
      this.replyDraft = '';
    } else {
      this.draft = '';
    }
    this.status = parentId ? 'Reply posted.' : 'Comment posted.';
  }
}

