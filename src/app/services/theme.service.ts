import {DOCUMENT} from '@angular/common';
import {Inject, Injectable, NgZone, OnDestroy} from '@angular/core';

export type ThemePreference = 'auto' | 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements OnDestroy {
  preference: ThemePreference = 'auto';
  private media?: MediaQueryList;
  private readonly systemChanged = () => {
    if (this.preference === 'auto') this.zone.run(() => this.apply());
  };
  private readonly storageChanged = (event: StorageEvent) => {
    if (event.key === 'theme' || event.key === null) this.zone.run(() => this.checkTheme());
  };

  constructor(@Inject(DOCUMENT) private document: Document, private zone: NgZone) {
    try { this.media = window.matchMedia('(prefers-color-scheme: dark)'); } catch { /* Fall back to light. */ }
    if (this.media?.addEventListener) this.media.addEventListener('change', this.systemChanged);
    else this.media?.addListener(this.systemChanged);
    window.addEventListener('storage', this.storageChanged);
  }

  checkTheme(): void {
    try {
      const saved = localStorage.getItem('theme');
      this.preference = saved === 'light' || saved === 'dark' ? saved : 'auto';
    } catch { /* Retain the in-memory preference if storage is blocked. */ }
    this.apply();
  }

  setPreference(value: string): void {
    if (!['auto', 'light', 'dark'].includes(value)) return;
    this.preference = value as ThemePreference;
    try {
      if (value === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', value);
    } catch { /* The preference still works for this page. */ }
    this.apply();
  }

  private apply(): void {
    const theme = this.preference === 'auto' ? (this.media?.matches ? 'dark' : 'light') : this.preference;
    this.document.body.classList.remove('light', 'dark');
    this.document.body.classList.add(theme);
    this.document.documentElement.style.colorScheme = theme;
  }

  ngOnDestroy(): void {
    if (this.media?.removeEventListener) this.media.removeEventListener('change', this.systemChanged);
    else this.media?.removeListener(this.systemChanged);
    window.removeEventListener('storage', this.storageChanged);
  }
}
