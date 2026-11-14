import {Component} from '@angular/core';
import {ThemeService} from "../../services/theme.service";

@Component({
  selector: 'app-theme-btn',
  templateUrl: './theme-btn.component.html',
  styleUrls: ['./theme-btn.component.scss']
})
export class ThemeBtnComponent {
  constructor(public themeService: ThemeService) {}
  change(event: Event): void { this.themeService.setPreference((event.target as HTMLSelectElement).value); }
}
