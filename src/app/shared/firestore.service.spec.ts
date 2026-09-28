import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from './firestore.service';
import { SavedPost } from './content-models';

const mock = vi.hoisted(() => ({
  get: vi.fn(), set: vi.fn(), update: vi.fn(), onSnapshot: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: (_db: unknown, path: string) => path,
  doc: (db: unknown, path?: string, id?: string) => ({ id: id ?? 'auto-id', path: id ? `${path}/${id}` : `${db}/auto-id` }),
  query: (...args: unknown[]) => args,
  where: (...args: unknown[]) => args,
  onSnapshot: mock.onSnapshot,
  runTransaction: (_db: unknown, callback: (transaction: unknown) => unknown) => callback(mock),
}));

describe('Firestore operations', () => {
  let service: FirestoreService;
  beforeEach(() => {
    vi.clearAllMocks();
    mock.get.mockReset();
    mock.onSnapshot.mockReturnValue(mock.unsubscribe);
    service = new FirestoreService();
  });
  it('ignores cached and uncommitted snapshots and unsubscribes', async () => {
    const next = vi.fn();
    const stop = service.watchPublished(next, vi.fn());
    await vi.waitFor(() => expect(mock.onSnapshot).toHaveBeenCalled());
    const receive = mock.onSnapshot.mock.calls[0][2];
    const docs = [{ id: 'server-id', data: () => ({ title: 'Confirmed' }) }];
    receive({ metadata: { fromCache: true, hasPendingWrites: false }, docs });
    receive({ metadata: { fromCache: false, hasPendingWrites: true }, docs });
    expect(next).not.toHaveBeenCalled();
    receive({ metadata: { fromCache: false, hasPendingWrites: false }, docs });
    expect(next).toHaveBeenCalledWith([{ id: 'server-id', title: 'Confirmed' }]);
    stop();
    expect(mock.unsubscribe).toHaveBeenCalled();
  });
  it('rejects editing another owner’s draft', async () => {
    mock.get.mockResolvedValue({ exists: () => true, data: () => ({ ownerId: 'someone-else', status: 'draft' }) });
    await expect(service.saveDraft({ ownerId: 'writer' } as Omit<SavedPost, 'id'>, 'post')).rejects.toThrow('unavailable');
    expect(mock.set).not.toHaveBeenCalled();
  });
  it('rejects replies to a comment on another article', async () => {
    mock.get.mockResolvedValueOnce({ exists: () => true, data: () => ({ status: 'published' }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ articleId: 'another-article' }) });
    await expect(service.addComment({ articleId: 'article', parentId: 'parent', authorId: 'reader', authorName: 'Reader', text: 'Reply', createdAt: '', likedBy: [] })).rejects.toThrow('unavailable');
    expect(mock.set).not.toHaveBeenCalled();
  });
  it('preserves other users’ likes from the transaction snapshot when liking and unliking', async () => {
    mock.get.mockResolvedValue({ exists: () => true, data: () => ({ likedBy: ['other'] }) });
    await service.toggleCommentLike('comment', 'reader');
    expect(mock.update).toHaveBeenLastCalledWith(expect.anything(), { likedBy: ['other', 'reader'] });
    mock.get.mockResolvedValue({ exists: () => true, data: () => ({ likedBy: ['other', 'reader', 'new-reader'] }) });
    await service.toggleCommentLike('comment', 'reader');
    expect(mock.update).toHaveBeenLastCalledWith(expect.anything(), { likedBy: ['other', 'new-reader'] });
  });
  it('does not publish missing drafts', async () => {
    mock.get.mockResolvedValue({ exists: () => false });
    await expect(service.publishDraft('missing', 'writer')).rejects.toThrow('unavailable');
    expect(mock.update).not.toHaveBeenCalled();
  });
});
