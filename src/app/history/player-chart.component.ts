import {AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild} from '@angular/core';
import {HistoryResponse} from './history.interface';
import {playerChart} from './history.utils';

@Component({selector: 'app-player-chart', templateUrl: './player-chart.component.html', styleUrls: ['./player-chart.component.scss']})
export class PlayerChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('frame') frame?: ElementRef<HTMLElement>;
  private source?: HistoryResponse;
  private observer?: ResizeObserver;
  private width = 960;
  private destroyed = false;
  chart = playerChart({from: 0, to: 1, interval: 300000, samples: []});
  activeIndex: number | null = null;
  @Input() set data(value: HistoryResponse) { this.source = value; this.rebuild(); }
  get from(): number { return this.source?.from || 0; }
  get to(): number { return this.source?.to || 0; }
  get active() { return this.activeIndex === null ? null : this.chart.points[this.activeIndex] || null; }
  get tooltipLeft(): number {
    const width = this.frame?.nativeElement.clientWidth || this.chart.width;
    const x = (this.active?.x || 0) / this.chart.width * width;
    return Math.max(92, Math.min(width - 92, x));
  }
  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    Promise.resolve().then(() => { if (!this.destroyed && this.frame) this.resize(this.frame.nativeElement.clientWidth); });
    if (typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(entries => {
      if (this.destroyed) return;
      this.resize(entries[0].contentRect.width);
    });
    if (this.frame) this.observer.observe(this.frame.nativeElement);
  }
  ngOnDestroy(): void { this.destroyed = true; this.observer?.disconnect(); }
  private resize(measured: number): void {
    if (!measured) return;
    const width = Math.max(180, Math.round(measured));
    if (width !== this.width) this.zone.run(() => { this.width = width; this.rebuild(); });
  }
  private rebuild(): void { this.activeIndex = null; if (this.source) this.chart = playerChart(this.source, this.width); }
  clear(): void { this.activeIndex = null; }

  hover(event: PointerEvent): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width * this.chart.width;
    const y = (event.clientY - rect.top) / rect.height * this.chart.height;
    if (x < this.chart.left || x > this.chart.right || y < this.chart.top || y > this.chart.bottom) {
      this.clear(); return;
    }
    let best = -1;
    let distance = Infinity;
    this.chart.points.forEach((point, index) => {
      const dx = Math.abs(point.x - x);
      if (dx < distance) { distance = dx; best = index; }
    });
    this.activeIndex = best < 0 ? null : best;
  }
  key(event: KeyboardEvent): void {
    if (!this.chart.points.length) return;
    if (event.key === 'Escape') { this.clear(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') this.activeIndex = 0;
    else if (event.key === 'End') this.activeIndex = this.chart.points.length - 1;
    else this.activeIndex = Math.max(0, Math.min(this.chart.points.length - 1,
      this.activeIndex === null ? 0 : this.activeIndex + (event.key === 'ArrowRight' ? 1 : -1)));
  }
}
