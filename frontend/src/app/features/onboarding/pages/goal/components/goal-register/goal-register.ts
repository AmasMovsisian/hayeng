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
  @Input() usernameChecking = false;
  @Input() usernameTouched = false;

  @Input() email = '';
  @Input() password = '';
  @Input() passwordConfirm = '';

  @Input() emailTouched = false;
  @Input() passwordTouched = false;
  @Input() passwordConfirmTouched = false;

  @Input() registrationValid = false;

  @Input() usernameError: string | null = null;
  @Input() emailError: string | null = null;
  @Input() passwordError: string | null = null;
  @Input() passwordConfirmError: string | null = null;

  @Input() registrationSubmitting = false;
  @Input() registrationError: string | null = null;
  @Input() registrationFieldErrors: Record<string, string[]> = {};

  @Output() usernameChange = new EventEmitter<string>();
  @Output() emailChange = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();
  @Output() passwordConfirmChange = new EventEmitter<string>();
  @Output() googleRegister = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  protected showPassword = false;
  protected showPasswordConfirm = false;

  get isUsernameFormatValid(): boolean {
    const value = this.username;
    if (value.length < 3 || value.length > 30) return false;
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) return false;
    if (/__/.test(value)) return false;
    if (/_$/.test(value)) return false;
    return true;
  }

  get usernameFormatError(): string {
    const value = this.username;
    if (!value) return 'Մուտքագրիր օգտանունդ։';
    if (value.length < 3) return 'Օգտանունը պետք է պարունակի առնվազն 3 նիշ։';
    if (value.length > 30) return 'Օգտանունը կարող է պարունակել առավելագույնը 30 նիշ։';
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) return 'Օգտանունը պետք է սկսվի տառով և պարունակի միայն լատինատառեր, թվեր և _։';
    if (/__/.test(value)) return 'Երկու _ իրար հետևից չեն թույլատրվում։';
    if (/_$/.test(value)) return 'Օգտանունը չի կարող ավարտվել _ նշանով։';
    return '';
  }

  protected onUsernameInput(value: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const sanitized = value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 30);
    if (input && input.value !== sanitized) input.value = sanitized;
    this.usernameChange.emit(sanitized);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  protected togglePasswordConfirmVisibility(): void {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }
}