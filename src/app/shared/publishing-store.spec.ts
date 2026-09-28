import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublishingStore } from './publishing-store';
import { FirestoreService } from './firestore.service';
import { Session } from './session';
import { SavedPost } from './content-models';

@Component({ template: '' })
class Host { readonly store = inject(PublishingStore); }

describe('Firestore publishing', () => {
  const user = signal<{ uid: string; displayName: string; photoURL: null } | null>(null);
  let receivePublic: (posts: SavedPost[]) => void;
  let receiveOwned: (posts: SavedPost[]) => void;
  const unsubscribe = vi.fn();
  const database = {
    watchPublished: vi.fn((next) => { receivePublic = next; return vi.fn(); }),
    watchOwned: vi.fn((_uid, next) => { receiveOwned = next; return unsubscribe; }),
    saveDraft: vi.fn(), publishDraft: vi.fn(), getDraft: vi.fn(),
  };
  const input = { title: 'Title', summary: 'Summary', category: 'Ideas', bio: '', body: '<p>Story</p>' };
  const draft: SavedPost = { ...input, id: 'server-id', ownerId: 'writer', authorId: 'writer', authorName: 'Writer', photo: null, status: 'draft', updatedAt: '2026-09-25T00:00:00.000Z' };
  let store: PublishingStore;
  beforeEach(async () => {
    vi.clearAllMocks();
    database.saveDraft.mockReset().mockResolvedValue(draft);
    database.publishDraft.mockReset().mockResolvedValue({ ...draft, status: 'published' });
    user.set({ uid: 'writer', displayName: 'Writer', photoURL: null });
    TestBed.configureTestingModule({ imports: [Host], providers: [
      { provide: Session, useValue: { user, ready: signal(true) } },
      { provide: FirestoreService, useValue: database },
    ] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    store = fixture.componentInstance.store;
    receivePublic([]);
    receiveOwned([]);
  });
  it('starts empty and displays only server supplied publications', () => {
    expect(store.articles()).toEqual([]);
    expect(store.authors()).toEqual([]);
    receivePublic([{ ...draft, status: 'published' }]);
    expect(store.articles()[0].id).toBe('server-id');
    expect(store.authors()[0].id).toBe('writer');
  });
  it('uses server IDs and never inserts drafts into display state before a snapshot', async () => {
    expect((await store.saveDraft(input))?.id).toBe('server-id');
    expect(store.myDrafts()).toEqual([]);
    expect(database.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'writer', body: '<p>Story</p>' }), undefined);
    receiveOwned([draft]);
    expect(store.findDraft('server-id')).toEqual(draft);
  });
  it('does not report failed saves as successful or publish them', async () => {
    database.saveDraft.mockRejectedValue(new Error('unavailable'));
    expect(await store.saveDraft(input)).toBeUndefined();
    expect(store.notice()).toContain('could not be saved');
    expect(store.myDrafts()).toEqual([]);
    expect(database.publishDraft).not.toHaveBeenCalled();
  });
  it('clears private posts and unsubscribes when an account changes', async () => {
    receiveOwned([draft]);
    const previousCallback = receiveOwned;
    user.set({ uid: 'another-writer', displayName: 'Another writer', photoURL: null });
    TestBed.tick();
    expect(unsubscribe).toHaveBeenCalled();
    expect(store.myPosts()).toEqual([]);
    expect(database.watchOwned).toHaveBeenLastCalledWith('another-writer', expect.any(Function), expect.any(Function));
    previousCallback([draft]);
    expect(store.myPosts()).toEqual([]);
  });
  it('publishes using the authenticated owner and surfaces failures', async () => {
    expect((await store.publishDraft('server-id'))?.id).toBe('server-id');
    expect(database.publishDraft).toHaveBeenCalledWith('server-id', 'writer');
    database.publishDraft.mockRejectedValue(new Error('permission-denied'));
    expect(await store.publishDraft('server-id')).toBeUndefined();
    expect(store.notice()).toContain('Publishing failed');
  });

  it('loads a confirmed draft directly before the owned snapshot arrives', async () => {
    database.getDraft.mockResolvedValue(draft);
    expect(store.findDraft(draft.id)).toBeUndefined();
    expect(await store.loadDraft(draft.id)).toEqual(draft);
    expect(database.getDraft).toHaveBeenCalledWith(draft.id, 'writer');
  });

  it('preserves headings and images on save and in published HTML', async () => {
    const body = '<h1>Heading</h1><h2>Section</h2><h3>Detail</h3><p><img src="https://example.com/photo.jpg" alt="Mountain"></p>';
    await store.saveDraft({ ...input, body });
    expect(database.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ body }), undefined);
    receivePublic([{ ...draft, body, status: 'published' }]);
    expect(store.articles()[0].htmlContent).toBe(body);
    await store.saveDraft({ ...input, body: '<p><img src="https://example.com/photo.jpg" alt="Mountain"></p>' });
    expect(database.saveDraft).toHaveBeenCalledTimes(2);
  });

  it('saves the chosen thumbnail and uses it for published articles', async () => {
    const thumbnail = 'https://example.com/cover.jpg';
    await store.saveDraft({ ...input, thumbnail });
    expect(database.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ thumbnail }), undefined);
    receivePublic([{ ...draft, thumbnail, status: 'published' }]);
    expect(store.articles()[0].thumbnail).toBe(thumbnail);
  });

  it('saves embedded PNG images and retains them in published HTML', async () => {
    const body = '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="Picture"></p>';
    await store.saveDraft({ ...input, body });
    expect(database.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ body }), undefined);
    receivePublic([{ ...draft, body, status: 'published' }]);
    expect(store.articles()[0].htmlContent).toBe(body);
  });

  it('rejects oversized image content before writing to Firestore', async () => {
    const body = '<p><img src="data:image/png;base64,' + 'A'.repeat(500000) + '"></p>';
    expect(await store.saveDraft({ ...input, body })).toBeUndefined();
    expect(database.saveDraft).not.toHaveBeenCalled();
    expect(store.notice()).toContain('500 KB');
  });

  it('discards a draft read if the account changes while it is loading', async () => {
    let finish!: (post: SavedPost) => void;
    database.getDraft.mockReturnValue(new Promise<SavedPost>(resolve => { finish = resolve; }));
    const loading = store.loadDraft(draft.id);
    user.set({ uid: 'another-writer', displayName: 'Another writer', photoURL: null });
    finish(draft);
    expect(await loading).toBeUndefined();
  });
});
