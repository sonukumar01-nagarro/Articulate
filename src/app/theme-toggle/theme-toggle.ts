import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  imports: [ButtonModule],
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly isDark = signal(false);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      let preference: string | null = null;

      try {
        preference = view?.localStorage.getItem('articulate-theme') ?? null;
      } catch {
        preference = 'light';
      }

      this.isDark.set(
        preference === 'dark' ||
          (preference !== 'light' &&
            (view?.matchMedia('(prefers-color-scheme: dark)').matches ?? false)),
      );
      this.syncThemeClass();
    });
  }

  protected toggleTheme(): void {
    const dark = !this.isDark();
    this.isDark.set(dark);
    this.syncThemeClass(dark);

    try {
      this.document.defaultView?.localStorage.setItem(
        'articulate-theme',
        dark ? 'dark' : 'light',
      );
    } catch {
      // The selected theme still applies for this page view.
    }
  }

  private syncThemeClass(dark = this.isDark()): void {
    this.document.documentElement.classList.toggle('app-dark', dark);
  }
}
