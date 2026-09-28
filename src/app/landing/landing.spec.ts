import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { Landing } from './landing';
import { auth } from './firebase.config';
import { FormFeedback } from '../shared/form-feedback';

vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  updateProfile: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(), signOut: vi.fn(), GoogleAuthProvider: class {},
}));

describe('Email authentication', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: { uid: 'new-user' } } as never);
    TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([])] });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  async function setup(signup = false, confirmation = 'password123') {
    const fixture = TestBed.createComponent(Landing);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    if (signup) {
      Array.from(root.querySelectorAll('button')).find(b => b.textContent?.includes('New here'))!.click();
      await fixture.whenStable();
    }
    for (const [id, value] of [['email', 'tester@example.com'], ['password', 'password123'], ...(signup ? [['name', '  Test Writer  '], ['confirm-password', confirmation]] : [])]) {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    return { fixture, root, submit: async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await fixture.whenStable();
    } };
  }

  it('signs in through Firebase and clears the password', async () => {
    const { root, submit } = await setup();
    await submit();
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'tester@example.com', 'password123');
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/home');
    expect(root.querySelector<HTMLInputElement>('#password')!.value).toBe('');
  });

  it('creates accounts through the same Firebase auth instance', async () => {
    const { submit } = await setup(true);
    await submit();
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'tester@example.com', 'password123');
    expect(updateProfile).toHaveBeenCalledWith({ uid: 'new-user' }, { displayName: 'Test Writer' });
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('rejects mismatched passwords before creating an account', async () => {
    const { root, submit } = await setup(true, 'different');
    await submit();
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Passwords do not match');
  });

  it('rejects whitespace-only names before creating an account', async () => {
    const { root, fixture, submit } = await setup(true);
    const input = root.querySelector<HTMLInputElement>('#name')!;
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await submit();
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Enter your name.');
  });

  it('retries only the profile update when name saving fails', async () => {
    vi.mocked(updateProfile).mockRejectedValueOnce(new Error('Network failure')).mockResolvedValueOnce();
    const { root, submit } = await setup(true);
    await submit();
    expect(TestBed.inject(FormFeedback).messages()[0].text).toContain('Your account was created');
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
    await submit();
    expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledTimes(2);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('shows authentication failures without navigating', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/invalid-credential' });
    const { root, submit } = await setup();
    await submit();
    expect(TestBed.inject(FormFeedback).messages()[0].text).toContain('Email or password is incorrect');
    expect(TestBed.inject(FormFeedback).messages()[0].severity).toBe('error');
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('keeps Google login available', async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({ user: { displayName: 'Tester' } } as never);
    const { root, fixture } = await setup();
    Array.from(root.querySelectorAll('button')).find(b => b.textContent?.includes('Continue with Google'))!.click();
    await fixture.whenStable();
    expect(signInWithPopup).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('shows email errors on blur, connects them to the input, and clears them on correction', async () => {
    const { root, fixture } = await setup();
    const input = root.querySelector<HTMLInputElement>('#email')!;
    input.value = 'invalid';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelector('#email-error')).toBeNull();
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(root.querySelector('#email-error')?.textContent).toContain('Enter a valid email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
    input.value = 'valid@example.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelector('#email-error')).toBeNull();
  });

  it('blocks invalid sign-in and displays required errors next to their fields', async () => {
    const { root, fixture, submit } = await setup();
    for (const id of ['email', 'password']) {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    await submit();
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
    expect(root.querySelector('#email-error')?.textContent).toContain('Enter your email');
    expect(root.querySelector('#password-error')?.textContent).toContain('Enter your password');
  });
});
