import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../shared/session';
import { FirestoreService } from '../shared/firestore.service';
import { ArticleComment, CommentStore } from './comment-store';

describe('Firestore comments', () => {
  const user = signal<{ uid: string; displayName: string } | null>(null);
  let store: CommentStore;
  let receive: (comments: ArticleComment[]) => void;
  let failed: () => void;
  const unsubscribe = vi.fn();
  const database = {
    watchComments: vi.fn((_id, next, error) => { receive = next; failed = error; return unsubscribe; }),
    addComment: vi.fn(), toggleCommentLike: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    database.addComment.mockReset().mockResolvedValue(undefined);
    database.toggleCommentLike.mockReset().mockResolvedValue(undefined);
    user.set({ uid: 'reader-one', displayName: 'First Reader' });
    TestBed.configureTestingModule({ providers: [CommentStore,
      { provide: Session, useValue: { user } }, { provide: FirestoreService, useValue: database },
    ] });
    store = TestBed.inject(CommentStore);
    store.watch('article-one');
    receive([]);
  });
  it('rejects signed-out, empty and oversized comments without writing', async () => {
    user.set(null);
    expect(await store.add('article-one', 'A thought')).toBe(false);
    user.set({ uid: 'reader-one', displayName: 'First Reader' });
    expect(await store.add('article-one', ' ')).toBe(false);
    expect(await store.add('article-one', 'a'.repeat(3001))).toBe(false);
    expect(database.addComment).not.toHaveBeenCalled();
  });
  it('waits for the database and leaves display state to server snapshots', async () => {
    let resolve!: () => void;
    database.addComment.mockReturnValue(new Promise<void>((done) => resolve = done));
    const pending = store.add('article-one', '  A thought.  ');
    expect(store.saving()).toBe(true);
    expect(store.comments()).toEqual([]);
    expect(database.addComment).toHaveBeenCalledWith(expect.objectContaining({
      articleId: 'article-one', text: 'A thought.', authorId: 'reader-one', parentId: null,
    }));
    resolve();
    expect(await pending).toBe(true);
    expect(store.saving()).toBe(false);
    expect(store.comments()).toEqual([]);
  });
  it('reports a rejected write without inserting a local comment', async () => {
    database.addComment.mockRejectedValue(new Error('permission-denied'));
    expect(await store.add('article-one', 'A thought')).toBe(false);
    expect(store.notice()).toContain('could not be saved');
    expect(store.comments()).toEqual([]);
    expect(store.saving()).toBe(false);
  });
  it('sends reply references and delegates likes to an atomic database operation', async () => {
    await store.add('article-one', 'Reply', 'parent');
    expect(database.addComment).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'parent' }));
    await store.toggleLike('comment-one');
    expect(database.toggleCommentLike).toHaveBeenCalledWith('comment-one', 'reader-one');
  });
  it('cleans up listeners and ignores late responses after navigating away', () => {
    const stop = store.watch('article-two');
    stop();
    expect(unsubscribe).toHaveBeenCalled();
    receive([{ id: 'late' } as ArticleComment]);
    expect(store.comments()).toEqual([]);
  });
  it('surfaces read failures', () => {
    failed();
    expect(store.ready()).toBe(true);
    expect(store.notice()).toContain('could not be loaded');
  });
});
