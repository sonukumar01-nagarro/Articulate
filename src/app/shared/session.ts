import { afterNextRender, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../landing/firebase.config';

@Injectable({ providedIn: 'root' })
export class Session {
  private readonly currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly ready = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        this.currentUser.set(user);
        this.ready.set(true);
      });
      this.destroyRef.onDestroy(unsubscribe);
    });
  }
}

