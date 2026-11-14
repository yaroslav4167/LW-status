import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ThemeService} from './theme.service';
import {ThemeBtnComponent} from '../navbar/theme-btn/theme-btn.component';
import {LocalizationModule} from '../i18n/localization.module';

describe('Theme preference', () => {
  let saved: string | null;
  let bodyClass: string;
  let colorScheme: string;
  let media: MediaQueryList;
  let dark: boolean;
  let service: ThemeService;
  let fixture: ComponentFixture<ThemeBtnComponent> | undefined;

  beforeEach(async () => {
    saved = localStorage.getItem('theme');
    bodyClass = document.body.className;
    colorScheme = document.documentElement.style.colorScheme;
    localStorage.removeItem('theme');
    dark = false;
    const target = new EventTarget();
    Object.defineProperty(target, 'matches', {get: () => dark});
    media = target as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(media);
    await TestBed.configureTestingModule({imports: [LocalizationModule], declarations: [ThemeBtnComponent]}).compileComponents();
    service = TestBed.inject(ThemeService);
  });
  afterEach(() => {
    fixture?.destroy(); fixture = undefined;
    TestBed.resetTestingModule();
    if (saved === null) localStorage.removeItem('theme'); else localStorage.setItem('theme', saved);
    document.body.className = bodyClass;
    document.documentElement.style.colorScheme = colorScheme;
  });
  const changed = () => media.dispatchEvent(new Event('change'));

  it('follows the device on first visit without saving the automatic result', () => {
    dark = true;
    service.checkTheme();
    expect(service.preference).toBe('auto');
    expect(document.body.classList.contains('dark')).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('theme')).toBeNull();
    dark = false; changed();
    expect(document.body.classList.contains('light')).toBeTrue();
    expect(document.body.classList.contains('dark')).toBeFalse();
    dark = true; changed();
    expect(document.body.classList.contains('dark')).toBeTrue();
  });
  it('retains manual choices despite the system theme and subsequent initialization', () => {
    for (const preference of ['dark', 'light']) {
      service.setPreference(preference);
      dark = preference !== 'dark'; changed();
      service.checkTheme();
      expect(service.preference).toBe(preference);
      expect(document.body.classList.contains(preference)).toBeTrue();
      expect(localStorage.getItem('theme')).toBe(preference);
    }
  });
  it('can return to automatic mode and then follows future system changes', () => {
    dark = true;
    service.setPreference('light');
    service.setPreference('auto');
    expect(document.body.classList.contains('dark')).toBeTrue();
    expect(localStorage.getItem('theme')).toBeNull();
    dark = false; changed();
    expect(document.body.classList.contains('light')).toBeTrue();
  });
  it('ignores invalid saved settings and invalid UI values', () => {
    localStorage.setItem('theme', 'unexpected');
    dark = true; service.checkTheme();
    expect(service.preference).toBe('auto');
    expect(document.body.classList.contains('dark')).toBeTrue();
    service.setPreference('unexpected');
    expect(service.preference).toBe('auto');
  });
  it('still works when storage is blocked', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('Storage blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('Storage blocked');
    spyOn(Storage.prototype, 'removeItem').and.throwError('Storage blocked');
    dark = true; service.checkTheme();
    expect(document.body.classList.contains('dark')).toBeTrue();
    service.setPreference('light'); service.checkTheme();
    expect(document.body.classList.contains('light')).toBeTrue();
    service.setPreference('auto');
    expect(document.body.classList.contains('dark')).toBeTrue();
    // Restore spies before this suite restores the original saved preference.
    (Storage.prototype.getItem as jasmine.Spy).and.callThrough();
    (Storage.prototype.setItem as jasmine.Spy).and.callThrough();
    (Storage.prototype.removeItem as jasmine.Spy).and.callThrough();
  });
  it('synchronizes preferences changed or cleared in another tab', () => {
    localStorage.setItem('theme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', {key: 'theme'}));
    expect(service.preference).toBe('dark');
    localStorage.removeItem('theme');
    window.dispatchEvent(new StorageEvent('storage', {key: null}));
    expect(service.preference).toBe('auto');
    expect(document.body.classList.contains('light')).toBeTrue();
  });
  it('cleans up listeners when the service is destroyed', () => {
    const remove = spyOn(media, 'removeEventListener').and.callThrough();
    const removeStorage = spyOn(window, 'removeEventListener').and.callThrough();
    service.ngOnDestroy();
    expect(remove).toHaveBeenCalledWith('change', jasmine.any(Function));
    expect(removeStorage).toHaveBeenCalledWith('storage', jasmine.any(Function));
  });
  it('falls back to light when system theme detection is unavailable', () => {
    TestBed.resetTestingModule();
    (window.matchMedia as jasmine.Spy).and.throwError('Unsupported');
    service = TestBed.inject(ThemeService);
    service.checkTheme();
    expect(document.body.classList.contains('light')).toBeTrue();
    service.setPreference('dark');
    expect(document.body.classList.contains('dark')).toBeTrue();
  });
  it('supports older media-query listeners and removes them on destruction', () => {
    TestBed.resetTestingModule();
    const legacy = {matches: true, addListener: jasmine.createSpy('addListener'), removeListener: jasmine.createSpy('removeListener')};
    (window.matchMedia as jasmine.Spy).and.returnValue(legacy);
    service = TestBed.inject(ThemeService);
    service.checkTheme();
    expect(document.body.classList.contains('dark')).toBeTrue();
    expect(legacy.addListener).toHaveBeenCalledWith(jasmine.any(Function));
    service.ngOnDestroy();
    expect(legacy.removeListener).toHaveBeenCalledWith(jasmine.any(Function));
  });
  it('provides a labeled native select for all three modes', () => {
    service.checkTheme();
    fixture = TestBed.createComponent(ThemeBtnComponent);
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.closest('label')).not.toBeNull();
    expect(Array.from(select.options).map(option => option.value)).toEqual(['auto', 'light', 'dark']);
    select.value = 'dark'; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(service.preference).toBe('dark');
    expect(document.body.classList.contains('dark')).toBeTrue();
    select.value = 'auto'; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(service.preference).toBe('auto');
  });
});
