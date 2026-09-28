import { Component, DestroyRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import { ImageCompressor } from './image-compressor';
import { FormFeedback } from '../shared/form-feedback';
import { storyExceedsSizeLimit } from '../shared/story-content';

@Component({
  selector: 'app-text-editor',
  imports: [FormsModule, QuillEditorComponent],
  providers: [ImageCompressor],
  template: `
    <quill-editor class="text-editor w-full" theme="snow" format="html" placeholder="Write your story..."
      [ngModel]="value()" (ngModelChange)="valueChange.emit($event ?? '')"
      [ngModelOptions]="{ standalone: true }" [disabled]="disabled() || compressing()" [sanitize]="true"
      [modules]="modules" [attr.aria-busy]="compressing()"
      [formats]="formats" [defaultEmptyValue]="''" (onBlur)="touched.emit()"
      (onEditorCreated)="editorRoot.set($event.root)">
      <div quill-editor-toolbar>
        <span class="ql-formats">
          <button type="button" class="ql-header" value="1" aria-label="Heading 1" title="Heading 1">H1</button>
          <button type="button" class="ql-header" value="2" aria-label="Heading 2" title="Heading 2">H2</button>
          <button type="button" class="ql-header" value="3" aria-label="Heading 3" title="Heading 3">H3</button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-bold" aria-label="Bold" title="Bold"></button>
          <button type="button" class="ql-italic" aria-label="Italic" title="Italic"></button>
          <button type="button" class="ql-underline" aria-label="Underline" title="Underline"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-list" value="ordered" aria-label="Numbered list" title="Numbered list"></button>
          <button type="button" class="ql-list" value="bullet" aria-label="Bulleted list" title="Bulleted list"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-link" aria-label="Insert link" title="Insert link"></button>
          <button type="button" class="ql-image" aria-label="Add image" title="Add image from your device"></button>
          <button type="button" class="ql-clean" aria-label="Clear formatting" title="Clear formatting"></button>
        </span>
      </div>
    </quill-editor>
    @if (compressing()) { <p class="mt-2 text-sm text-muted-color" role="status">Compressing image…</p> }
    <p class="mt-2 text-xs text-muted-color">Images are automatically compressed before embedding. The complete story must fit within 500 KB.</p>
  `,
  styles: `
    :host { display: block; min-width: 0; max-width: 100%; }
    .text-editor { background: var(--p-content-background); color: var(--p-text-color); border-radius: .5rem; }
    :host ::ng-deep .ql-container { font: inherit; }
    :host ::ng-deep .ql-editor { min-height: 18rem; overflow-wrap: anywhere; }
    :host ::ng-deep .ql-editor img { max-width: 100%; height: auto; object-fit: contain; }
    :host ::ng-deep .ql-toolbar .ql-header { width: 2.5rem; }
    :host ::ng-deep .ql-toolbar { border-radius: .5rem .5rem 0 0; }
    :host ::ng-deep .ql-container { border-radius: 0 0 .5rem .5rem; }
    :host ::ng-deep .ql-stroke { stroke: var(--p-text-color); }
    :host ::ng-deep .ql-fill { fill: var(--p-text-color); }
  `,
})
export class TextEditor {
  readonly value = input('');
  readonly valueChange = output<string>();
  readonly disabled = input(false);
  readonly labelledBy = input('post-body-label');
  readonly invalid = input(false);
  readonly describedBy = input('');
  readonly required = input(false);
  readonly touched = output<void>();
  readonly processingChange = output<boolean>();
  protected readonly compressing = signal(false);
  private readonly compressor = inject(ImageCompressor);
  private readonly feedback = inject(FormFeedback);
  private readonly destroyRef = inject(DestroyRef);
  private readonly quill = viewChild(QuillEditorComponent);
  protected readonly modules = {
    uploader: {
      mimetypes: ['image/png', 'image/jpeg'],
      handler: (range: { index: number; length: number }, files: File[]) => { void this.insertImages(range, files); },
    },
  };
  protected readonly formats = ['header', 'bold', 'italic', 'underline', 'list', 'link', 'image'];
  protected readonly editorRoot = signal<HTMLElement | null>(null);

  constructor() {
    // ngx-quill manages editing and lifecycle; only accessibility metadata is applied here.
    effect(() => {
      const root = this.editorRoot();
      if (!root) return;
      root.setAttribute('role', 'textbox');
      root.setAttribute('aria-multiline', 'true');
      root.setAttribute('aria-labelledby', this.labelledBy());
      root.setAttribute('aria-invalid', String(this.invalid()));
      root.setAttribute('aria-required', String(this.required()));
      if (this.describedBy()) root.setAttribute('aria-describedby', this.describedBy());
      else root.removeAttribute('aria-describedby');
    });
  }

  private async insertImages(range: { index: number; length: number }, files: File[]): Promise<void> {
    const editor = this.quill()?.quillEditor;
    if (!editor || this.disabled() || this.compressing() || !files.length) return;
    this.compressing.set(true);
    this.processingChange.emit(true);
    this.feedback.clear();
    const originalValue = this.value();
    try {
      const images: string[] = [];
      for (const file of files) {
        images.push(await this.compressor.compress(file));
        if (this.destroyRef.destroyed) return;
        if (this.disabled() || this.value() !== originalValue) throw new Error('The story changed while compressing. Please add the image again.');
        const addedHtml = images.map(src => `<p><img src="${src}"></p>`).join('');
        if (storyExceedsSizeLimit(this.value() + addedHtml)) {
          throw new Error('These images would exceed the 500 KB story limit. Remove an existing image or choose fewer images.');
        }
      }
      // Keep the built-in picker/drop behavior; only replace its encoding step.
      editor.editReadOnly(() => editor.updateContents([
        { retain: range.index }, { delete: range.length },
        ...images.map(image => ({ insert: { image } })),
      ], 'user'));
      editor.setSelection(range.index + images.length, 0, 'silent');
      this.feedback.show('Image compressed and added.', 'success');
    } catch (error) {
      if (!this.destroyRef.destroyed) this.feedback.show(error instanceof Error ? error.message : 'Could not compress this image.');
    } finally {
      if (!this.destroyRef.destroyed) {
        this.compressing.set(false);
        this.processingChange.emit(false);
      }
    }
  }
}
