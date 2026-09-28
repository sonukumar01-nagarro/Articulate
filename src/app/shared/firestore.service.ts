import { Injectable } from '@angular/core';
import type { Unsubscribe } from 'firebase/firestore';
import { app } from '../landing/firebase.config';
import { ArticleComment, SavedPost } from './content-models';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private connection?: Promise<{ sdk: typeof import('firebase/firestore'); firestore: import('firebase/firestore').Firestore }>;

  private connect() {
    return this.connection ??= import('firebase/firestore').then((sdk) => ({ sdk, firestore: sdk.getFirestore(app) }));
  }

  watchPublished(next: (posts: SavedPost[]) => void, error: () => void): Unsubscribe {
    return this.watch('posts', 'status', 'published', next, error);
  }

  watchOwned(uid: string, next: (posts: SavedPost[]) => void, error: () => void): Unsubscribe {
    return this.watch('posts', 'ownerId', uid, next, error);
  }

  watchComments(articleId: string, next: (comments: ArticleComment[]) => void, error: () => void): Unsubscribe {
    return this.watch('comments', 'articleId', articleId, next, error);
  }

  private watch<T>(path: string, field: string, value: string, next: (items: T[]) => void, error: () => void): Unsubscribe {
    let stopped = false;
    let unsubscribe: Unsubscribe | undefined;
    void this.connect().then(({ sdk, firestore }) => {
      if (stopped) return;
      const source = sdk.query(sdk.collection(firestore, path), sdk.where(field, '==', value));
      unsubscribe = sdk.onSnapshot(source, { includeMetadataChanges: true }, (snapshot) => {
        // Only confirmed server results become display state.
        if (stopped || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        next(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as T));
      }, () => { if (!stopped) error(); });
    }).catch(() => { if (!stopped) error(); });
    return () => { stopped = true; unsubscribe?.(); };
  }

  async saveDraft(post: Omit<SavedPost, 'id'>, id?: string): Promise<SavedPost> {
    const { sdk: { doc, collection, runTransaction }, firestore } = await this.connect();
    const reference = id ? doc(firestore, 'posts', id) : doc(collection(firestore, 'posts'));
    const saved: SavedPost = { ...post, id: reference.id };
    await runTransaction(firestore, async (transaction) => {
      const current = await transaction.get(reference);
      if (id && (!current.exists() || current.data()['ownerId'] !== post.ownerId || current.data()['status'] !== 'draft')) {
        throw new Error('Draft is unavailable');
      }
      transaction.set(reference, saved);
    });
    return saved;
  }

  async getDraft(id: string, uid: string): Promise<SavedPost | undefined> {
    const { sdk: { doc, getDocFromServer }, firestore } = await this.connect();
    const snapshot = await getDocFromServer(doc(firestore, 'posts', id));
    if (!snapshot.exists()) return undefined;
    const post = { ...snapshot.data(), id: snapshot.id } as SavedPost;
    return post.ownerId === uid && post.status === 'draft' ? post : undefined;
  }

  async publishDraft(id: string, uid: string): Promise<SavedPost> {
    const { sdk: { doc, runTransaction }, firestore } = await this.connect();
    return runTransaction(firestore, async (transaction) => {
      const reference = doc(firestore, 'posts', id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists() || snapshot.data()['ownerId'] !== uid || snapshot.data()['status'] !== 'draft') {
        throw new Error('Draft is unavailable');
      }
      const post = { ...snapshot.data(), id, status: 'published', updatedAt: new Date().toISOString() } as SavedPost;
      transaction.update(reference, { status: post.status, updatedAt: post.updatedAt });
      return post;
    });
  }

  async addComment(comment: Omit<ArticleComment, 'id'>): Promise<void> {
    const { sdk: { doc, collection, runTransaction }, firestore } = await this.connect();
    const reference = doc(collection(firestore, 'comments'));
    await runTransaction(firestore, async (transaction) => {
      const article = await transaction.get(doc(firestore, 'posts', comment.articleId));
      if (!article.exists() || article.data()['status'] !== 'published') throw new Error('Article is unavailable');
      if (comment.parentId) {
        const parent = await transaction.get(doc(firestore, 'comments', comment.parentId));
        if (!parent.exists() || parent.data()['articleId'] !== comment.articleId) throw new Error('Reply is unavailable');
      }
      transaction.set(reference, { ...comment, id: reference.id });
    });
  }

  async toggleCommentLike(id: string, uid: string): Promise<void> {
    const { sdk: { doc, runTransaction }, firestore } = await this.connect();
    await runTransaction(firestore, async (transaction) => {
      const reference = doc(firestore, 'comments', id);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error('Comment is unavailable');
      const likes = snapshot.data()['likedBy'] as string[];
      transaction.update(reference, {
        likedBy: likes.includes(uid) ? likes.filter((value) => value !== uid) : [...likes, uid],
      });
    });
  }
}
