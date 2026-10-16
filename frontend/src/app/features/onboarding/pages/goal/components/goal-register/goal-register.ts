import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppFooter } from '../../../../../../shared/app-footer/app-footer';

@Component({
  selector: 'app-goal-register',
  standalone: true,
  imports: [CommonModule, AppFooter],
  templateUrl: './goal-register.html',
  styleUrl: './goal-register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalRegister {
  @Input() username = '';
  @Input() usernameAvailable = false;
  @Input() email = '';
  @Input() password = '';
  @Input() passwordConfirm = '';
  @Input() registrationValid = false;

  @Output() usernameChange = new EventEmitter<string>();
  @Output() emailChange = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();
  @Output() passwordConfirmChange = new EventEmitter<string>();
  @Output() googleRegister = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  get usernameValid(): boolean {
    const value = this.username.trim();

    return (
      value.length >= 3 &&
      value.length <= 30 &&
      /^[a-zA-Z0-9_]+$/.test(value)
    );
  }

  get usernameError(): string {
    const value = this.username.trim();

    if (value.length < 3) {
      return 'Username-ը պետք է պարունակի առնվազն 3 նիշ։';
    }

    if (value.length > 30) {
      return 'Username-ը կարող է պարունակել առավելագույնը 30 նիշ։';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Օգտագործիր միայն լատինատառ տառեր, թվեր և _ նշանը։';
    }

    return '';
  }
}