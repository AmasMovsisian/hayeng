import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Gender } from '../../models/goal.models';
@Component({
  selector: 'app-goal-profile',
  standalone: true,
  templateUrl: './goal-profile.html',
  styleUrl: './goal-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalProfile implements OnChanges {
  @ViewChild('nativeDateInput')
  nativeDateInput?: ElementRef<HTMLInputElement>;
  @Input() username = '';
  @Input() dateOfBirth = '';
  @Input() gender: Gender | null = null;
  @Input() usernameTouched = false;
  @Input() dateOfBirthTouched = false;
  @Input() genderTouched = false;
  @Input() usernameValid = false;
  @Input() ageValid = false;
  @Input() genderValid = false;
  @Input() usernameError: string | null = null;
  @Input() dateOfBirthError: string | null = null;
  @Output() usernameInput = new EventEmitter<string>();
  @Output() usernameBlur = new EventEmitter<void>();
  @Output() dateOfBirthChange = new EventEmitter<string>();
  @Output() dateOfBirthBlur = new EventEmitter<void>();
  @Output() genderChange = new EventEmitter<Gender>();
  @Output() genderBlur = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  dateInputValue = '';
  private isEditingDate = false;
  get canContinue(): boolean {
    return (
      this.usernameValid &&
      this.ageValid &&
      this.genderValid
    );
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['dateOfBirth'] &&
      !this.isEditingDate
    ) {
      this.syncDateInputValue();
    }
  }
  onUsernameInput(value: string): void {
    this.usernameInput.emit(value);
  }
  onDateInput(value: string): void {
    this.isEditingDate = true;
    const digits = value
      .replace(/\D/g, '')
      .slice(0, 8);
    this.dateInputValue = this.formatDateInput(digits);
    if (digits.length < 8) {
      this.dateOfBirthChange.emit('');
      return;
    }
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    if (!this.isValidCalendarDate(day, month, year)) {
      this.dateOfBirthChange.emit('');
      return;
    }
    const isoDate =
      `${year.toString().padStart(4, '0')}-` +
      `${month.toString().padStart(2, '0')}-` +
      `${day.toString().padStart(2, '0')}`;
    this.dateOfBirthChange.emit(isoDate);
  }
  onDateBlur(): void {
    this.isEditingDate = false;
    this.syncDateInputValue();
    this.dateOfBirthBlur.emit();
  }
  onNativeDateChange(value: string): void {
    if (!value) {
      return;
    }
    const formatted = this.formatDateForDisplay(value);
    if (!formatted) {
      return;
    }
    this.isEditingDate = false;
    this.dateInputValue = formatted;
    this.dateOfBirthChange.emit(value);
    this.dateOfBirthBlur.emit();
  }
  openDatePicker(): void {
    const input = this.nativeDateInput?.nativeElement;
    if (!input) {
      return;
    }
    if ('showPicker' in HTMLInputElement.prototype) {
      try {
        input.showPicker();
        return;
      } catch {
      }
    }
    input.click();
  }
  onGenderChange(value: Gender): void {
    if (value !== 'male' && value !== 'female') {
      return;
    }
    this.genderChange.emit(value);
  }
  onNext(): void {
    if (!this.canContinue) {
      return;
    }
    this.next.emit();
  }
  private syncDateInputValue(): void {
    if (!this.dateOfBirth) {
      this.dateInputValue = '';
      return;
    }
    const formatted = this.formatDateForDisplay(this.dateOfBirth);
    if (formatted) {
      this.dateInputValue = formatted;
    }
  }
  private formatDateInput(digits: string): string {
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return (
      `${digits.slice(0, 2)}/` +
      `${digits.slice(2, 4)}/` +
      `${digits.slice(4, 8)}`
    );
  }
  private formatDateForDisplay(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return '';
    }
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  private isValidCalendarDate(
    day: number,
    month: number,
    year: number
  ): boolean {
    if (
      !Number.isInteger(day) ||
      !Number.isInteger(month) ||
      !Number.isInteger(year)
    ) {
      return false;
    }
    if (year < 1900 || year > 2100) {
      return false;
    }
    if (month < 1 || month > 12) {
      return false;
    }
    if (day < 1 || day > 31) {
      return false;
    }
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }
}