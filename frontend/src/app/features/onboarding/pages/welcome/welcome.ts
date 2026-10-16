import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppFooter } from '../../../../shared/app-footer/app-footer';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [AppFooter],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Welcome {
  constructor(private readonly router: Router) {}

  start(): void {
    this.router.navigate(['/onboarding/goal']);
  }
}
