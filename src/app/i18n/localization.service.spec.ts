import {TestBed} from '@angular/core/testing';
import {deviceLanguage, LocalDatePipe, LocalNumberPipe, LocalizationService, TranslationPipe} from './localization.service';
import {translations} from './translations';

describe('Localization', () => {
  let original: string | null;
  let originalLang: string;
  beforeEach(() => { original = localStorage.getItem('lw-status-language'); originalLang = document.documentElement.lang; localStorage.removeItem('lw-status-language'); });
  afterEach(() => { if (original) localStorage.setItem('lw-status-language', original); else localStorage.removeItem('lw-status-language'); document.documentElement.lang = originalLang; });

  it('matches device language regions and preferred supported fallbacks', () => {
    expect(deviceLanguage(['ru-RU', 'en'])).toBe('ru');
    expect(deviceLanguage(['uk-UA'])).toBe('uk');
    expect(deviceLanguage(['de-DE', 'ru'])).toBe('ru');
    expect(deviceLanguage(['fr-FR'])).toBe('en');
  });
  it('uses device language automatically and supports a persistent override', () => {
    spyOnProperty(navigator, 'languages', 'get').and.returnValue(['ru-RU']);
    const service = TestBed.inject(LocalizationService);
    expect(service.language).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
    service.setPreference('uk');
    expect(service.translate('History')).toBe('Історія');
    expect(localStorage.getItem('lw-status-language')).toBe('uk');
    service.setPreference('auto');
    expect(service.language).toBe('ru');
    expect(localStorage.getItem('lw-status-language')).toBeNull();
  });
  it('translates parameters and updates number/date formatting with the language', () => {
    const service = TestBed.inject(LocalizationService);
    service.setPreference('en');
    const number = new LocalNumberPipe(service);
    const date = new LocalDatePipe(service);
    const text = new TranslationPipe(service);
    expect(number.transform(1.5, '1.1-1')).toBe('1.5');
    service.setPreference('ru');
    expect(number.transform(1.5, '1.1-1')).toBe('1,5');
    expect(number.transform('0')).toBe('0');
    expect(number.transform(null)).toBe('—');
    expect(date.transform(new Date(2026, 0, 10), 'MMMM')).toContain('январ');
    expect(text.transform('Show {count} more ({remaining} hidden)', {count: 5, remaining: 9})).toContain('9');
  });
  it('falls back to source text for unknown messages and rejects unknown preferences', () => {
    const service = TestBed.inject(LocalizationService);
    service.setPreference('uk'); service.setPreference('unexpected');
    expect(service.language).toBe('uk');
    expect(service.translate('Untranslated {name}', {name: 'device'})).toBe('Untranslated device');
  });
  it('formats the same instant in the visitor zone, including fractional offsets and date rollover', () => {
    const service = TestBed.inject(LocalizationService);
    service.setPreference('en');
    const instant = Date.parse('2026-01-01T00:30:00Z');
    const zone = spyOnProperty(service, 'timeZone', 'get').and.returnValue('America/Los_Angeles');
    const pipe = new LocalDatePipe(service);
    expect(pipe.transform(instant)).toContain('31 Dec 2025');
    expect(pipe.transform(instant)).toContain('16:30:00');
    zone.and.returnValue('Asia/Kathmandu');
    expect(pipe.transform(instant)).toContain('01 Jan 2026');
    expect(pipe.transform(instant)).toContain('06:15:00');
    zone.and.returnValue('Pacific/Kiritimati');
    expect(pipe.transform(Date.parse('2026-01-01T23:30:00Z'))).toContain('02 Jan 2026');
  });
  it('uses the offset at the observation date and distinguishes repeated DST hours', () => {
    const service = TestBed.inject(LocalizationService);
    service.setPreference('en');
    spyOnProperty(service, 'timeZone', 'get').and.returnValue('America/New_York');
    const pipe = new LocalDatePipe(service);
    expect(pipe.transform('2026-01-10T12:00:00Z')).toContain('07:00:00');
    expect(pipe.transform('2026-07-10T12:00:00Z')).toContain('08:00:00');
    const before = pipe.transform('2026-11-01T05:30:00Z');
    const after = pipe.transform('2026-11-01T06:30:00Z');
    expect(before).toContain('01:30:00');
    expect(after).toContain('01:30:00');
    expect(before).not.toBe(after);
    expect(pipe.transform('2026-03-08T06:30:00Z')).toContain('01:30:00');
    expect(pipe.transform('2026-03-08T07:30:00Z')).toContain('03:30:00');
  });
  it('does not derive the time zone from the language or shift ISO timestamps twice', () => {
    const service = TestBed.inject(LocalizationService);
    const zone = service.timeZone;
    service.setPreference('uk');
    expect(service.timeZone).toBe(zone);
    spyOnProperty(service, 'timeZone', 'get').and.returnValue('Europe/Berlin');
    const pipe = new LocalDatePipe(service);
    const iso = '2026-07-10T12:00:00Z';
    expect(pipe.transform(iso)).toContain('14:00:00');
    expect(pipe.transform(Date.parse(iso))).toBe(pipe.transform(new Date(iso)));
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('invalid')).toBe('—');
  });
  it('has both translations and preserves all interpolation parameters', () => {
    Object.entries(translations).forEach(([source, values]) => {
      const parameters = (value: string) => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
      expect(values.ru.length).toBeGreaterThan(0);
      expect(values.uk.length).toBeGreaterThan(0);
      expect(parameters(values.ru)).toEqual(parameters(source));
      expect(parameters(values.uk)).toEqual(parameters(source));
    });
  });
});
