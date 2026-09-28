import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostEditor } from './post-editor';
import { TextEditor } from './text-editor';
import { SiteHeader } from '../shared/site-header';
import { Session } from '../shared/session';
import { PublishingStore } from '../shared/publishing-store';
import { FormFeedback } from '../shared/form-feedback';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';

@Component({ selector: 'app-site-header', template: '' })
class HeaderStub {}
@Component({ selector: 'app-text-editor', template: '' })
class EditorStub {
  value = input(''); disabled = input(false); labelledBy = input('');
  invalid = input(false); describedBy = input(''); required = input(false);
  valueChange = output<string>(); touched = output<void>();
  processingChange = output<boolean>();
}

describe('Post form validation', () => {
  const store = {
    ready: signal(true), notice: signal(''), findDraft: vi.fn(),
    saveDraft: vi.fn(), publishDraft: vi.fn(), loadDraft: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    store.notice.set('');
    TestBed.configureTestingModule({ imports: [PostEditor], providers: [provideRouter([
      { path: 'author/posts/new', component: PostEditor },
      { path: 'author/posts/:id/edit', component: PostEditor },
    ]),
      { provide: Session, useValue: { ready: signal(true), user: signal({ uid: 'writer' }) } },
      { provide: PublishingStore, useValue: store },
    ] });
    TestBed.overrideComponent(PostEditor, { remove: { imports: [SiteHeader, TextEditor] }, add: { imports: [HeaderStub, EditorStub] } });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('blocks empty and whitespace-only posts and shows persistent inline errors', async () => {
    const fixture = TestBed.createComponent(PostEditor);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.field-error')).toBeNull();
    const title = root.querySelector<HTMLInputElement>('#post-title')!;
    title.value = '   ';
    title.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(store.saveDraft).not.toHaveBeenCalled();
    expect(root.querySelector('#post-title-error')?.textContent).toContain('Enter a title');
    expect(root.querySelector('#post-summary-error')).not.toBeNull();
    expect(root.querySelector('#post-body-error')).not.toBeNull();
    expect(root.querySelector('#post-bio-error')).toBeNull();
    title.value = 'My story';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelector('#post-title-error')).toBeNull();
  });

  it('saves valid posts and displays success feedback', async () => {
    const fixture = TestBed.createComponent(PostEditor);
    await fixture.whenStable();
    // Set editor output through its public component contract.
    const { By } = await import('@angular/platform-browser');
    const editor = fixture.debugElement.query(By.directive(EditorStub)).componentInstance as EditorStub;
    editor.valueChange.emit('<p>Story content</p>');
    const root = fixture.nativeElement as HTMLElement;
    for (const [id, value] of [['post-title', 'Title'], ['post-summary', 'Description']]) {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    store.saveDraft.mockResolvedValue({ id: 'draft-1' });
    await fixture.whenStable();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(store.saveDraft).toHaveBeenCalled();
    expect(TestBed.inject(FormFeedback).messages()[0].severity).toBe('success');
  });

  it('keeps saved fields after real navigation while the list snapshot is delayed, then publishes', async () => {
    vi.mocked(TestBed.inject(Router).navigate).mockRestore();
    const harness = await RouterTestingHarness.create('/author/posts/new');
    await harness.fixture.whenStable();
    const editor = harness.routeDebugElement!.query(By.directive(EditorStub)).componentInstance as EditorStub;
    editor.valueChange.emit('<p>Saved story</p>');
    for (const [id, value] of [['post-title', 'Saved title'], ['post-summary', 'Saved description']]) {
      const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    const saved = { id: 'draft-1', title: 'Saved title', summary: 'Saved description', category: 'Ideas', bio: '', body: '<p>Saved story</p>' };
    store.saveDraft.mockResolvedValue(saved);
    store.loadDraft.mockResolvedValue(saved);
    // findDraft remains empty: the transaction finished before the list listener.
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/author/posts/draft-1/edit');
    expect(store.loadDraft).toHaveBeenCalledWith('draft-1');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement!.querySelector('#post-title')).not.toBeNull();
    });
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('#post-title')!.value).toBe('Saved title');
    expect(harness.routeDebugElement!.query(By.directive(EditorStub)).componentInstance.value()).toBe('<p>Saved story</p>');
    expect(TestBed.inject(FormFeedback).messages()[0].severity).toBe('success');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.publishDraft.mockResolvedValue({ id: 'draft-1' });
    const publish = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(button => button.textContent?.includes('Publish'))!;
    expect(publish.disabled).toBe(false);
    publish.click();
    await harness.fixture.whenStable();
    expect(store.publishDraft).toHaveBeenCalledWith('draft-1');
    expect(navigate).toHaveBeenCalledWith(['/articles', 'draft-1']);
  });
});
