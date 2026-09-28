import { Component, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { MessageModule } from 'primeng/message';

@Injectable({ providedIn: 'root' })
export class FormFeedback {
  readonly messages = signal<{ id: number; text: string; severity: 'success' | 'error' }[]>([]);
  private sequence = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  show(text: string, severity: 'success' | 'error' = 'error'): void {
    this.clear();
    this.messages.set([{ id: ++this.sequence, text, severity }]);
    this.timer = setTimeout(() => this.clear(), 5000);
  }

  clear(): void {
    clearTimeout(this.timer);
    this.messages.set([]);
  }
}

@Component({
  selector: 'app-form-feedback',
  imports: [MessageModule],
  template: `
    <div class="fixed left-4 right-4 top-4 z-60 mx-auto max-w-lg">
      @for (message of feedback.messages(); track message.id) {
        <div class="overflow-hidden rounded-md bg-white shadow-lg dark:bg-zinc-900">
        <p-message [severity]="message.severity" [closable]="true" (onClose)="feedback.clear()"
          [attr.role]="message.severity === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="message.severity === 'error' ? 'assertive' : 'polite'">{{ message.text }}</p-message>
        </div>
      }
    </div>
  `,
})
export class FormFeedbackOutlet {
  protected readonly feedback = inject(FormFeedback);
}
