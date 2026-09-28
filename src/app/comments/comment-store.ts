import { inject, Injectable, signal } from '@angular/core';
import { FirestoreService } from '../shared/firestore.service';
import { Session } from '../shared/session';
import { ArticleComment } from '../shared/content-models';
export type { ArticleComment } from '../shared/content-models';

@Injectable()
export class CommentStore {
  private readonly session = inject(Session);
  private readonly database = inject(FirestoreService);
  private readonly records = signal<ArticleComment[]>([]);
  readonly comments = this.records.asReadonly();
  readonly notice = signal('');
  readonly ready = signal(false);
  readonly saving = signal(false);

  watch(articleId: string): () => void {
    this.records.set([]);
    this.ready.set(false);
    this.notice.set('');
    let active = true;
    const unsubscribe = this.database.watchComments(articleId, (comments) => {
      if (!active) return;
      this.records.set(comments);
      this.ready.set(true);
    }, () => {
      if (!active) return;
      this.records.set([]);
      this.notice.set('Comments could not be loaded from Firestore. Check your connection and reload.');
      this.ready.set(true);
    });
    return () => { active = false; unsubscribe(); };
  }

  async add(articleId: string, text: string, parentId: string | null = null): Promise<boolean> {
    const user = this.session.user();
    const content = text.trim();
    if (!this.ready() || this.saving() || !user || !content || content.length > 3000) return false;
    this.saving.set(true);
    this.notice.set('');
    try {
      await this.database.addComment({
        articleId, parentId, authorId: user.uid,
        authorName: user.displayName || 'Reader', text: content,
        createdAt: new Date().toISOString(), likedBy: [],
      });
      return true;
    } catch {
      this.notice.set('Your comment could not be saved to Firestore. Please try again.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async toggleLike(id: string): Promise<void> {
    const user = this.session.user();
    if (!this.ready() || this.saving() || !user) return;
    this.saving.set(true);
    this.notice.set('');
    try {
      await this.database.toggleCommentLike(id, user.uid);
    } catch {
      this.notice.set('Your like could not be saved to Firestore. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
