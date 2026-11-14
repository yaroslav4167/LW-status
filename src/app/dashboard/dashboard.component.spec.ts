import {CommonModule} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {DashboardComponent} from './dashboard.component';
import {InfrastructureAlertComponent} from '../infrastructure-alert/infrastructure-alert.component';
import {LocalizationModule} from '../i18n/localization.module';
import {ApiFetchService} from '../services/api-fetch.service';
import {InfrastructureStatusService} from '../services/infrastructure-status.service';

describe('Dashboard card layout', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  const longName = 'ATM 10 (play.logixy.net:3637)';
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, LocalizationModule],
      declarations: [DashboardComponent, InfrastructureAlertComponent],
      providers: [
        {provide: ApiFetchService, useValue: {
          loadGameServers: () => {}, isGamesLoading: false,
          gamesStatus: [longName, 'SkyTech', 'server-with-an-extremely-long-unbroken-hostname.example.net:3637'].map(name =>
            ({name, status: 'Online', online: 0, slots: 20, percent: 100}))
        }},
        {provide: InfrastructureStatusService, useValue: {
          refresh: () => {}, state$: of({devices: [{name: longName, icon: 'fa-solid fa-server', available: 'Online'}],
            loading: false, error: false, checkedAt: null})
        }}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.nativeElement.style.display = 'block';
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('keeps long names, status and player counts inside equally sized cards', () => {
    const host: HTMLElement = fixture.nativeElement;
    for (const width of [280, 320, 480, 900]) {
      host.style.width = `${width}px`;
      const cards = Array.from(host.querySelectorAll<HTMLElement>('.game'));
      const first = cards[0].getBoundingClientRect();
      expect(first.width).toBeGreaterThan(0);
      cards.forEach(card => {
        const bounds = card.getBoundingClientRect();
        expect(Math.abs(bounds.width - first.width)).toBeLessThan(1);
        expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
        card.querySelectorAll<HTMLElement>('.game__wrapper, .game__info__name, .game__info__state, .game-slots').forEach(element => {
          const rect = element.getBoundingClientRect();
          expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
          expect(rect.right).toBeLessThanOrEqual(bounds.right + 1);
        });
      });
      const infra: HTMLElement = host.querySelector('.status')!;
      expect(infra.scrollWidth).toBeLessThanOrEqual(infra.clientWidth + 1);
    }
    expect(host.querySelector('.game__info__name')?.textContent).toBe(longName);
    expect(host.querySelector('.game__info__name')?.getAttribute('title')).toBe(longName);
  });
});
