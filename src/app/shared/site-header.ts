import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { signOut } from 'firebase/auth';
import { auth } from '../landing/firebase.config';
import { ButtonModule } from 'primeng/button';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { Session } from './session';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, ButtonModule, ThemeToggle],
  template: `
    <app-theme-toggle />
    <header class="border-b border-surface bg-surface-0 dark:bg-surface-900">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-5 pl-5 pr-20 sm:pl-8">
        <a routerLink="/home" class="text-xl font-semibold text-color no-underline">Articulate</a>
        <nav class="flex flex-wrap items-center gap-2" aria-label="Main navigation">
          <a pButton routerLink="/home" variant="text" routerLinkActive="font-bold" ariaCurrentWhenActive="page">Home</a>
          <a pButton routerLink="/authors" variant="text" routerLinkActive="font-bold" ariaCurrentWhenActive="page">Authors</a>
          @if (session.user(); as user) {
            <a pButton routerLink="/author/posts/new" variant="text">Write</a>
            <a pButton routerLink="/author/posts" variant="text">Your stories</a>
            <span class="hidden text-sm text-muted-color sm:inline">{{ user.displayName || user.email || 'Reader' }}</span>
            <button pButton type="button" variant="text" [disabled]="signingOut()" (click)="logout()">Sign out</button>
          } @else {
            <a pButton routerLink="/" variant="outlined">Sign in</a>
          }
        </nav>
      </div>
      @if (error()) { <p role="alert" class="px-5 pb-3 text-sm">{{ error() }}</p> }
    </header>
  `,
})
export class SiteHeader {
  protected readonly session = inject(Session);
  private readonly router = inject(Router);
  protected readonly signingOut = signal(false);
  protected readonly error = signal('');

  protected async logout(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.error.set('');
    try {
      await signOut(auth);
      await this.router.navigateByUrl('/');
    } catch {
      this.error.set('Unable to sign out. Please try again.');
    } finally {
      this.signingOut.set(false);
    }
  }
}

