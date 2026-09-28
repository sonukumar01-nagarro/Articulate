import { signal } from '@angular/core';

// Field errors remain visible until corrected; only action feedback expires.
export class FormValidation {
  private readonly touched = signal(new Set<string>());
  private readonly submitted = signal(false);

  touch(field: string): void {
    this.touched.update(fields => new Set([...fields, field]));
  }

  submit(): void { this.submitted.set(true); }
  reset(): void { this.touched.set(new Set()); this.submitted.set(false); }
  show(field: string, error: string): string {
    return this.submitted() || this.touched().has(field) ? error : '';
  }
}
