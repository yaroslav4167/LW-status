import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {CommonModule} from '@angular/common';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {environment} from '../../environments/environment';
import {HistoryComponent} from './history.component';
import {of} from 'rxjs';
import {RouterTestingModule} from '@angular/router/testing';
import {LocalizationModule} from '../i18n/localization.module';
import {LocalizationService} from '../i18n/localization.service';
import {InfrastructureStatusService} from '../services/infrastructure-status.service';
import {InfrastructureAlertComponent} from '../infrastructure-alert/infrastructure-alert.component';
import {PlayerChartComponent} from './player-chart.component';
import {OutageLogComponent} from './outage-log.component';

describe('HistoryComponent', () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, HttpClientTestingModule, LocalizationModule, RouterTestingModule],
      declarations: [HistoryComponent, InfrastructureAlertComponent, PlayerChartComponent, OutageLogComponent],
      providers: [{provide: InfrastructureStatusService, useValue: {state$: of({devices: [], loading: false, error: false, checkedAt: null}), refresh: () => {}}}]
    }).compileComponents();
    TestBed.inject(LocalizationService).setPreference('en');
    fixture = TestBed.createComponent(HistoryComponent);
    fixture.componentInstance.demoMode = false;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); http.verify(); });

  it('renders an empty state instead of fabricated history', () => {
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({
      from: 0, to: 86400000, interval: 300000, samples: []
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your history starts here');
  });

  it('shows configured devices with no measurements before the first collection', () => {
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({
      from: 0, to: 86400000, interval: 300000, samples: [],
      equipment: [{id: 'new', name: 'New device', icon: 'fas fa-server', enabled: true}]
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('New device');
    expect(fixture.nativeElement.querySelector('.equipment-meta strong').textContent).toBe('—');
  });

  it('offers a retry after an API error', () => {
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({}, {status: 503, statusText: 'Unavailable'});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('History is unavailable');
    fixture.componentInstance.load();
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({
      from: 0, to: 86400000, interval: 300000, samples: []
    });
    expect(fixture.componentInstance.error).toBeFalse();
  });
  it('updates timeline tooltips and the zone label without changing measurements', () => {
    const service = TestBed.inject(LocalizationService);
    const zone = spyOnProperty(service, 'timeZone', 'get').and.returnValue('UTC');
    const from = Date.parse('2026-07-10T12:00:00Z');
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({from, to: from + 300000, interval: 300000, samples: []});
    const cell = {from, to: from + 300000, state: 'online' as const, uptime: 100};
    const utc = fixture.componentInstance.cellTitle(cell);
    expect(utc).toContain('12:00:00');
    zone.and.returnValue('Asia/Kathmandu');
    const local = fixture.componentInstance.cellTitle(cell);
    expect(local).toContain('17:45:00');
    expect(local).not.toBe(utc);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Asia/Kathmandu');
    expect(fixture.componentInstance.data?.from).toBe(from);
  });

  it('cancels the previous request when the period changes', () => {
    const first = http.expectOne(`${environment.HISTORY_URL}?days=1`);
    fixture.componentInstance.load(7);
    expect(first.cancelled).toBeTrue();
    http.expectOne(`${environment.HISTORY_URL}?days=7`).flush({
      from: 0, to: 604800000, interval: 300000, samples: []
    });
    expect(fixture.componentInstance.days).toBe(7);
  });

  it('renders demo history without a backend request', fakeAsync(() => {
    http.expectOne(`${environment.HISTORY_URL}?days=1`).flush({
      from: 0, to: 86400000, interval: 300000, samples: []
    });
    fixture.componentInstance.toggleDemo();
    tick(200);
    fixture.detectChanges();
    http.expectNone(request => request.url === environment.HISTORY_URL);
    expect(fixture.nativeElement.textContent).toContain('Demo preview');
    expect(fixture.nativeElement.textContent).toContain('Edge router');
    expect(fixture.componentInstance.summary?.rows.length).toBe(4);
    expect(fixture.componentInstance.error).toBeFalse();
  }));
});
