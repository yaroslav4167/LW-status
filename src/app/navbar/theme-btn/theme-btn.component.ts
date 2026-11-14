import {Component} from '@angular/core';
import {ThemePreference, ThemeService} from '../../services/theme.service';

@Component({
  selector: 'app-theme-btn',
  templateUrl: './theme-btn.component.html',
  styleUrls: ['./theme-btn.component.scss']
})
export class ThemeBtnComponent {
  readonly options: {value: ThemePreference; label: string; icon: string}[] = [
    {value: 'auto', label: 'Auto', icon: 'fa-circle-half-stroke'},
    {value: 'light', label: 'Light theme', icon: 'fa-sun'},
    {value: 'dark', label: 'Dark theme', icon: 'fa-moon'},
    {value: 'acid', label: 'Acid theme', icon: 'fa-flask'}
  ];
  constructor(public themeService: ThemeService) {}
}
