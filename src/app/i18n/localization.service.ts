import {DOCUMENT, formatNumber, registerLocaleData} from '@angular/common';
import ru from '@angular/common/locales/ru';
import uk from '@angular/common/locales/uk';
import enGB from '@angular/common/locales/en-GB';
import {Inject, Injectable, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {translations} from './translations';

registerLocaleData(ru); registerLocaleData(uk); registerLocaleData(enGB);
export type Language = 'en' | 'ru' | 'uk';
export type LanguagePreference = Language | 'auto';
export type LocalDateFormat = 'medium' | 'short' | 'MMMM';
export function deviceLanguage(languages: readonly string[]): Language {
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (['en', 'ru', 'uk'].includes(base)) return base as Language;
  }
  return 'en';
}

@Injectable({providedIn: 'root'})
export class LocalizationService implements OnDestroy {
  preference: LanguagePreference = 'auto';
  language: Language = 'en';
  private readonly storageKey = 'lw-status-language';
  private readonly languageChanged = () => this.update();
  private zoneCheckedAt = -Infinity;
  private detectedZone = 'UTC';
  private readonly dateFormatters = new Map<string, Intl.DateTimeFormat>();
  private readonly focused = () => { this.zoneCheckedAt = -Infinity; };
  constructor(@Inject(DOCUMENT) private document: Document) {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && ['en', 'ru', 'uk'].includes(saved)) this.preference = saved as Language;
    } catch { /* Storage may be disabled. */ }
    this.update();
    if (typeof window !== 'undefined') window.addEventListener('languagechange', this.languageChanged);
    if (typeof window !== 'undefined') window.addEventListener('focus', this.focused);
  }
  get locale(): string { return this.language === 'en' ? 'en-GB' : this.language; }
  get timeZone(): string {
    // Re-resolve after travel/OS changes without constructing Intl on every
    // impure pipe invocation. The zone is independent of the UI language.
    const now = Date.now();
    if (Math.abs(now - this.zoneCheckedAt) >= 1000) {
      try { this.detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
      catch { this.detectedZone = 'UTC'; }
      this.zoneCheckedAt = now;
    }
    return this.detectedZone;
  }
  formatDate(value: number | string | Date | null | undefined, format: LocalDateFormat = 'medium', timeZone = this.timeZone): string {
    if (value == null) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    const key = `${this.locale}|${timeZone}|${format}`;
    let formatter = this.dateFormatters.get(key);
    if (!formatter) {
      const options: Intl.DateTimeFormatOptions = format === 'MMMM' ? {month: 'long'} : {
        year: 'numeric', month: format === 'short' ? '2-digit' : 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        ...(format === 'medium' ? {second: '2-digit', timeZoneName: 'short'} as const : {})
      };
      formatter = new Intl.DateTimeFormat(this.locale, {...options, timeZone});
      if (this.dateFormatters.size >= 32) this.dateFormatters.clear();
      this.dateFormatters.set(key, formatter);
    }
    return formatter.format(date);
  }
  setPreference(value: string): void {
    if (!['auto', 'en', 'ru', 'uk'].includes(value)) return;
    this.preference = value as LanguagePreference;
    try { if (value === 'auto') localStorage.removeItem(this.storageKey); else localStorage.setItem(this.storageKey, value); } catch { /* Keep the in-memory preference. */ }
    this.update();
  }
  private update(): void {
    this.language = this.preference === 'auto' ? deviceLanguage(typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]) : this.preference;
    this.document.documentElement.lang = this.language;
  }
  translate(key: string | null | undefined, parameters: {[key: string]: string | number} = {}): string {
    const source = key || '';
    const text = this.language === 'en' ? source : translations[source]?.[this.language] || source;
    return text.replace(/\{(\w+)\}/g, (match, name: string) => parameters[name] === undefined ? match : String(parameters[name]));
  }
  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('languagechange', this.languageChanged);
      window.removeEventListener('focus', this.focused);
    }
  }
}

@Pipe({name: 't', pure: false})
export class TranslationPipe implements PipeTransform {
  constructor(private i18n: LocalizationService) {}
  transform(value: string | null | undefined, parameters?: {[key: string]: string | number}): string { return this.i18n.translate(value, parameters); }
}
@Pipe({name: 'localDate', pure: false})
export class LocalDatePipe implements PipeTransform {
  private previous?: {value: number | string; format: string; locale: string; timeZone: string; text: string};
  constructor(private i18n: LocalizationService) {}
  transform(value: number | string | Date | null | undefined, format: LocalDateFormat = 'medium'): string {
    if (value == null) return '';
    const key = value instanceof Date ? value.getTime() : value;
    const timeZone = this.i18n.timeZone;
    if (this.previous?.value === key && this.previous.format === format && this.previous.locale === this.i18n.locale && this.previous.timeZone === timeZone) return this.previous.text;
    const text = this.i18n.formatDate(value, format, timeZone);
    this.previous = {value: key, format, locale: this.i18n.locale, timeZone, text};
    return text;
  }
}
@Pipe({name: 'localNumber', pure: false})
export class LocalNumberPipe implements PipeTransform {
  private previous?: {value: number; digits: string; locale: string; text: string};
  constructor(private i18n: LocalizationService) {}
  transform(value: number | string | null | undefined, digits = '1.0-0'): string {
    const number = typeof value === 'string' && value.trim() ? Number(value) : value;
    if (number == null || typeof number !== 'number' || !Number.isFinite(number)) return '—';
    if (this.previous?.value === number && this.previous.digits === digits && this.previous.locale === this.i18n.locale) return this.previous.text;
    const text = formatNumber(number, this.i18n.locale, digits);
    this.previous = {value: number, digits, locale: this.i18n.locale, text};
    return text;
  }
}
