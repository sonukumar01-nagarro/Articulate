import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormFeedback } from './form-feedback';

describe('Timed form feedback', () => {
  afterEach(() => vi.useRealTimers());

  it('clears after five seconds and gives repeated messages a fresh timer', () => {
    vi.useFakeTimers();
    const feedback = TestBed.inject(FormFeedback);
    feedback.show('Failed');
    vi.advanceTimersByTime(4000);
    const firstId = feedback.messages()[0].id;
    feedback.show('Failed');
    expect(feedback.messages()[0].id).not.toBe(firstId);
    vi.advanceTimersByTime(4999);
    expect(feedback.messages()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(feedback.messages()).toEqual([]);
  });

  it('supports success feedback and manual dismissal', () => {
    const feedback = TestBed.inject(FormFeedback);
    feedback.show('Saved', 'success');
    expect(feedback.messages()[0].severity).toBe('success');
    feedback.clear();
    expect(feedback.messages()).toEqual([]);
  });
});
