import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextEditor } from './text-editor';
import { ImageCompressor } from './image-compressor';
import { FormFeedback } from '../shared/form-feedback';

@Component({
  imports: [TextEditor],
  template: '<label id="story-label">Story</label><app-text-editor [(value)]="body" labelledBy="story-label" />',
})
class EditorHost { body = '<p>Saved story</p>'; }

describe('Quill text editor', () => {
  const compressor = { compress: vi.fn() };
  beforeEach(() => {
    // jsdom does not implement selection geometry used by Quill's default picker.
    const createRange = document.createRange.bind(document);
    vi.spyOn(document, 'createRange').mockImplementation(() => {
      const range = createRange();
      range.getBoundingClientRect = () => new DOMRect();
      range.getClientRects = () => [] as unknown as DOMRectList;
      return range;
    });
    compressor.compress.mockReset().mockResolvedValue('data:image/webp;base64,UklGRg==');
    TestBed.overrideComponent(TextEditor, { set: { providers: [{ provide: ImageCompressor, useValue: compressor }] } });
  });
  afterEach(() => vi.restoreAllMocks());
  it('uses the default file picker and preserves embedded images when reopened', async () => {
    TestBed.configureTestingModule({ imports: [EditorHost] });
    const fixture = TestBed.createComponent(EditorHost);
    fixture.componentInstance.body = '';
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ql-editor')).toBeTruthy();
    });
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Add image"]')!.click();
    const picker = root.querySelector<HTMLInputElement>('input.ql-image[type="file"]')!;
    expect(picker).toBeTruthy();
    expect(picker.accept).toContain('image/png');
    expect(root.querySelector('section[aria-label="Insert image"]')).toBeNull();
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' });
    Object.defineProperty(picker, 'files', { value: [file] });
    picker.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance.body).toContain('data:image/webp;base64,');
    });
    const saved = fixture.componentInstance.body;
    fixture.destroy();
    const reopened = TestBed.createComponent(EditorHost);
    reopened.componentInstance.body = saved;
    await reopened.whenStable();
    await vi.waitFor(() => {
      reopened.detectChanges();
      expect(reopened.nativeElement.querySelector('.ql-editor img')?.getAttribute('src')).toContain('data:image/webp;base64,');
    });
    expect(compressor.compress).toHaveBeenCalledWith(file);
  });

  it('keeps the existing story when compression fails', async () => {
    compressor.compress.mockRejectedValue(new Error('Could not compress this image.'));
    TestBed.configureTestingModule({ imports: [EditorHost] });
    const fixture = TestBed.createComponent(EditorHost);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ql-editor')).toBeTruthy();
    });
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Add image"]')!.click();
    const picker = root.querySelector<HTMLInputElement>('input.ql-image[type="file"]')!;
    Object.defineProperty(picker, 'files', { value: [new File(['bad'], 'bad.png', { type: 'image/png' })] });
    picker.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.body).toBe('<p>Saved story</p>');
    expect(TestBed.inject(FormFeedback).messages()[0].severity).toBe('error');
    expect(root.querySelector('.ql-editor')?.getAttribute('contenteditable')).toBe('true');
  });
  it('preserves headings and list formatting when reopening a saved story', async () => {
    TestBed.configureTestingModule({ imports: [EditorHost] });
    const fixture = TestBed.createComponent(EditorHost);
    fixture.componentInstance.body = '<h1>First</h1><h2>Second</h2><h3>Third</h3><p><strong>Bold</strong> and <em>italic</em></p><ul><li>Item</li></ul>';
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ql-editor h3')?.textContent).toBe('Third');
    });
    for (const level of [1, 2, 3]) {
      expect(fixture.nativeElement.querySelector(`.ql-editor h${level}`)).toBeTruthy();
      expect(fixture.nativeElement.querySelector(`[aria-label="Heading ${level}"]`)).toBeTruthy();
    }
    expect(fixture.nativeElement.querySelector('.ql-editor strong')?.textContent).toBe('Bold');
    expect(fixture.nativeElement.querySelector('.ql-editor li')?.textContent).toContain('Item');
  });
  it('loads saved HTML, labels the editor and emits edits', async () => {
    TestBed.configureTestingModule({ imports: [EditorHost] });
    const fixture = TestBed.createComponent(EditorHost);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ql-editor')).toBeTruthy();
    });
    fixture.detectChanges();
    const editor = fixture.nativeElement.querySelector('.ql-editor') as HTMLElement;
    expect(editor.textContent).toContain('Saved story');
    expect(editor.getAttribute('aria-labelledby')).toBe('story-label');
    expect(fixture.nativeElement.querySelector('[aria-label="Bold"]')).toBeTruthy();
    editor.innerHTML = '<p>Changed story</p>';
    await vi.waitFor(() => expect(fixture.componentInstance.body.replaceAll('&nbsp;', ' ')).toContain('Changed story'));
  });
});
