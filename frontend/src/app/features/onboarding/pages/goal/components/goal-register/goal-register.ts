import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-goal-register',
  standalone: true,
  templateUrl: './goal-register.html',
  styleUrl: './goal-register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalRegister {
  @Input() email = '';
  @Input() password = '';
  @Input() passwordConfirm = '';
  @Input() registrationValid = false;

  @Output() emailChange = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();
  @Output() passwordConfirmChange = new EventEmitter<string>();
  @Output() googleRegister = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}