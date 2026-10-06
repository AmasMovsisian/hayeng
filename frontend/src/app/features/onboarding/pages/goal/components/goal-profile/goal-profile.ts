import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-goal-profile',
  standalone: true,
  templateUrl: './goal-profile.html',
  styleUrl: './goal-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalProfile implements OnChanges {
  @ViewChild('nativeDateInput')
  private nativeDateInput?: ElementRef<HTMLInputElement>;

  @Input() username = '';
  @Input() dateOfBirth = '';
  @Input() usernameTouched = false;
  @Input() dateOfBirthTouched = false;
  @Input() usernameValid = false;
  @Input() ageValid = false;
  @Input() usernameError: string | null = null;
  @Input() dateOfBirthError: string | null = null;

  @Output() usernameInput = new EventEmitter<string>();
  @Output() usernameBlur = new EventEmitter<void>();
  @Output() dateOfBirthChange = new EventEmitter<string>();
  @Output() dateOfBirthBlur = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  protected dateInputValue = '';

  ngOnChanges(): void {
    if (this.dateOfBirth) {
      this.dateInputValue = this.formatDateForDisplay(this.dateOfBirth);
    } else if (!this.dateInputValue) {
      this.dateInputValue = '';
    }
  }

  protected onDateInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    let formatted = digits;

    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    this.dateInputValue = formatted;

    if (digits.length === 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);

      this.dateOfBirthChange.emit(`${year}-${month}-${day}`);
      return;
    }

    this.dateOfBirthChange.emit('');
  }

  protected onNativeDateChange(value: string): void {
    if (!value) {
      return;
    }

    this.dateInputValue = this.formatDateForDisplay(value);
    this.dateOfBirthChange.emit(value);
    this.dateOfBirthBlur.emit();
  }

  private formatDateForDisplay(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return '';
    }

    return `${match[3]}/${match[2]}/${match[1]}`;
  }
}
