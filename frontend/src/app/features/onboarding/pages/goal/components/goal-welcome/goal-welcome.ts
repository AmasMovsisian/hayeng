import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-goal-welcome',
  standalone: true,
  templateUrl: './goal-welcome.html',
  styleUrl: './goal-welcome.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalWelcome {
  @Input() username = '';
  @Output() next = new EventEmitter<void>();
}