import {ElementRef, NgZone} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {LocalizationModule} from '../i18n/localization.module';
import {PlayerChartComponent} from './player-chart.component';

describe('Player chart interaction', () => {
  it('shows the actual online count and time near the hovered measurement', () => {
    const chart = new PlayerChartComponent({run: (callback: () => void) => callback()} as NgZone);
    chart.data = {from: 0, to: 900000, interval: 300000, samples: [
      {timestamp: 300000, equipment: null, players: 3}, {timestamp: 600000, equipment: null, players: 19}
    ]};
    const point = chart.chart.points[1];
    chart.hover({currentTarget: {getBoundingClientRect: () => ({left: 10, top: 20, width: 480, height: 240})},
      clientX: 10 + point.x / 2, clientY: 20 + point.y} as unknown as PointerEvent);
    expect(chart.active?.online).toBe(19);
    expect(chart.active?.timestamp).toBe(600000);
    chart.key({key: 'Home', preventDefault: () => {}} as KeyboardEvent);
    expect(chart.active?.online).toBe(3);
    chart.key({key: 'Escape'} as KeyboardEvent);
    expect(chart.active).toBeNull();
  });
  it('positions the tooltip in screen coordinates even before a resize observer fires', () => {
    const chart = new PlayerChartComponent({run: (callback: () => void) => callback()} as NgZone);
    chart.data = {from: 0, to: 900000, interval: 300000, samples: [{timestamp: 450000, players: 10, equipment: null}]};
    chart.frame = new ElementRef({clientWidth: 320} as HTMLElement);
    chart.activeIndex = 0;
    expect(chart.tooltipLeft).toBeCloseTo(chart.chart.points[0].x / 3, 1);
  });
  it('selects the nearest real measurement by time even on the connecting line across a long gap', () => {
    const chart = new PlayerChartComponent({run: (callback: () => void) => callback()} as NgZone);
    chart.data = {from: 0, to: 1800000, interval: 300000, samples: [
      {timestamp: 300000, equipment: null, players: 0},
      {timestamp: 600000, equipment: null, players: null},
      {timestamp: 1500000, equipment: null, players: 20}
    ]};
    const [first, last] = chart.chart.points;
    const event = {currentTarget: {getBoundingClientRect: () => ({left: 10, top: 20, width: 480, height: 240})},
      clientX: 10 + (first.x + (last.x - first.x) * .6) / 2,
      clientY: 20 + (first.y + (last.y - first.y) * .6)} as unknown as PointerEvent;
    chart.hover(event);
    expect(chart.active?.timestamp).toBe(1500000);
    expect(chart.active?.online).toBe(20);
    chart.hover({...event, clientX: 10 + first.x / 2, clientY: 120} as PointerEvent);
    expect(chart.active?.online).toBe(0);
    chart.hover({...event, clientX: 0} as PointerEvent);
    expect(chart.active).toBeNull();
  });
  it('renders one continuous line without circles and keeps touch, keyboard and tooltip dismissal', async () => {
    await TestBed.configureTestingModule({imports: [CommonModule, LocalizationModule], declarations: [PlayerChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(PlayerChartComponent);
    fixture.componentInstance.data = {from: 0, to: 1800000, interval: 300000, samples: [
      {timestamp: 300000, equipment: null, players: 0},
      {timestamp: 600000, equipment: null, players: null},
      {timestamp: 1500000, equipment: null, players: 20}
    ]};
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const svg = host.querySelector('svg')!;
    spyOn(svg, 'getBoundingClientRect').and.returnValue({left: 0, top: 0, width: 960, height: 240} as DOMRect);
    expect(host.querySelectorAll('.line').length).toBe(1);
    expect(host.querySelector('.line')?.getAttribute('d')).toContain(' L');
    expect(host.querySelectorAll('circle').length).toBe(0);
    svg.dispatchEvent(new PointerEvent('pointerdown', {pointerType: 'touch', clientX: 700, clientY: 100}));
    fixture.detectChanges();
    expect(fixture.componentInstance.active?.online).toBe(20);
    expect(host.querySelector('.tooltip')).not.toBeNull();
    expect(host.querySelectorAll('circle').length).toBe(0);
    svg.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home'}));
    fixture.detectChanges();
    expect(fixture.componentInstance.active?.online).toBe(0);
    svg.dispatchEvent(new PointerEvent('pointerleave'));
    fixture.detectChanges();
    expect(host.querySelector('.tooltip')).toBeNull();
    fixture.destroy();
  });
});
