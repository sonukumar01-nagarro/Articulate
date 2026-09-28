import { Component, ElementRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormsModule, NgForm, Validators } from '@angular/forms';
import { FormFeedback } from '../shared/form-feedback';
import { FormValidation } from '../shared/form-validation';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, User } from 'firebase/auth';
import { ButtonModule } from 'primeng/button';
import { auth } from './firebase.config';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  imports: [ButtonModule, ThemeToggle, FormsModule],
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  private readonly router = inject(Router);
  private readonly feedback = inject(FormFeedback);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly validation = new FormValidation();
  protected readonly signingIn = signal(false);
  protected readonly creatingAccount = signal(false);
  protected readonly pendingProfile = signal<User | null>(null);
  protected name = '';
  protected email = '';
  protected password = '';
  protected confirmPassword = '';

  private errors(): Record<string, string> {
    const pending = !!this.pendingProfile();
    return {
      name: this.creatingAccount() && !this.name.trim() ? 'Enter your name.' : '',
      email: pending ? '' : !this.email.trim() ? 'Enter your email address.' :
        Validators.email(new FormControl(this.email)) ? 'Enter a valid email address.' : '',
      password: pending ? '' : !this.password ? 'Enter your password.' :
        this.creatingAccount() && this.password.length < 6 ? 'Use at least 6 characters.' : '',
      confirmPassword: pending || !this.creatingAccount() ? '' : !this.confirmPassword ? 'Confirm your password.' :
        this.password !== this.confirmPassword ? 'Passwords do not match.' : '',
    };
  }

  protected fieldError(field: string): string {
    return this.validation.show(field, this.errors()[field]);
  }

  protected toggleMode(): void {
    if (this.signingIn() || this.pendingProfile()) return;
    this.creatingAccount.update(value => !value);
    this.password = '';
    this.confirmPassword = '';
    this.feedback.clear();
    this.validation.reset();
  }

  protected async submitEmail(form: NgForm): Promise<void> {
    if (this.signingIn()) return;
    this.validation.submit();
    this.feedback.clear();
    if (Object.values(this.errors()).some(Boolean)) {
      form.control.markAllAsTouched();
      const first = Object.keys(this.errors()).find(field => this.errors()[field]);
      this.element.nativeElement.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    this.signingIn.set(true);
    try {
      if (this.creatingAccount()) {
        if (!this.pendingProfile()) {
          const credential = await createUserWithEmailAndPassword(auth, this.email.trim(), this.password);
          this.pendingProfile.set(credential.user);
          this.password = '';
          this.confirmPassword = '';
        }
        await updateProfile(this.pendingProfile()!, { displayName: this.name.trim() });
        this.pendingProfile.set(null);
      } else {
        await signInWithEmailAndPassword(auth, this.email.trim(), this.password);
      }
      this.password = '';
      this.confirmPassword = '';
      this.validation.reset();
      this.feedback.show('Signed in successfully.', 'success');
      await this.router.navigateByUrl('/home');
    } catch (error) {
      if (this.pendingProfile()) {
        this.feedback.show('Your account was created, but your name could not be saved. Please try Save name again.');
        return;
      }
      const code = (error as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'Email or password is incorrect. Please try again.',
        'auth/wrong-password': 'Email or password is incorrect. Please try again.',
        'auth/user-not-found': 'Email or password is incorrect. Please try again.',
        'auth/email-already-in-use': 'This email already has an account. Sign in or continue with Google.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
        'auth/password-does-not-meet-requirements': 'Choose a stronger password that meets the account password policy.',
        'auth/operation-not-allowed': 'Email sign-in is not enabled yet. Please use Google or contact the app administrator.',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
        'auth/network-request-failed': 'Check your connection and try again.',
        'auth/user-disabled': 'This account is disabled. Contact the app administrator.',
      };
      this.feedback.show(messages[code ?? ''] ?? 'Unable to sign in. Please try again.');
    } finally {
      this.signingIn.set(false);
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    if (this.signingIn() || this.pendingProfile()) return;
    this.signingIn.set(true);
    this.feedback.clear();

    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const name = credential.user.displayName ?? credential.user.email ?? 'your Google account';
      this.feedback.show(`Signed in as ${name}.`, 'success');
      await this.router.navigateByUrl('/home');
    } catch (error) {
      const code = (error as { code?: string }).code;
      this.feedback.show(
        code === 'auth/popup-closed-by-user'
          ? 'Google sign-in was cancelled.'
          : 'Unable to sign in with Google. Please try again.',
      );
    } finally {
      this.signingIn.set(false);
    }
  }

  protected async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.feedback.show('You have been signed out.', 'success');
    } catch {
      this.feedback.show('Unable to sign out. Please try again.');
    }
  }

}
