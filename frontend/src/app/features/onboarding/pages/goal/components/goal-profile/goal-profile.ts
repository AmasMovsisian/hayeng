import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { AppFooter } from '../../../../../../shared/app-footer/app-footer';

const MAX_NAME_LENGTH = 32;

const NAME_ERRORS = {
  required: 'Գրիր քո անունը։',
  tooLong: 'Անունը չպետք է գերազանցի 32 նիշը։',
  leadingOrTrailingSpace: 'Անվան սկզբում կամ վերջում բացատներ չեն թույլատրվում։',
  repeatedSpaces: 'Անվան մասերի միջև օգտագործիր միայն մեկ բացատ։',
  invalidCharacters: 'Օգտագործիր միայն տառեր, բացատ, գծիկ կամ ընդգծման նշան։',
  invalidSeparator: 'Գծիկը կամ ընդգծման նշանը պետք է լինի տառերի միջև։',
  tooManyParts: 'Մուտքագրիր միայն անունդ կամ անունն ու ազգանունդ։',
  invalidFormat: 'Ստուգիր անվան գրությունը և փորձիր կրկին։',
} as const;

@Component({
  selector: 'app-goal-profile',
  standalone: true,
  templateUrl: './goal-profile.html',
  styleUrl: './goal-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppFooter],
})
export class GoalProfile implements OnChanges {
  @ViewChild('nativeDateInput')
  nativeDateInput?: ElementRef<HTMLInputElement>;

  @Input() displayName = '';
  @Input() dateOfBirth = '';
  @Input() gender: Gender | null = null;

  @Input() displayNameTouched = false;
  @Input() dateOfBirthTouched = false;
  @Input() genderTouched = false;

  @Input() displayNameValid = false;
  @Input() genderValid = false;

  @Input() displayNameError: string | null = null;
  @Input() dateOfBirthError: string | null = null;

  @Output() displayNameInput = new EventEmitter<string>();
  @Output() displayNameBlur = new EventEmitter<void>();
  @Output() dateOfBirthChange = new EventEmitter<string>();
  @Output() dateOfBirthBlur = new EventEmitter<void>();
  @Output() genderChange = new EventEmitter<Gender>();
  @Output() genderBlur = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  dateInputValue = '';
  nameFormatInvalid = false;
  nameErrorMessage: string = NAME_ERRORS.required;

  private isEditingDate = false;

  private readonly namePattern =
    /^[\p{L}\p{M}]+(?:[-_][\p{L}\p{M}]+)*(?: [\p{L}\p{M}]+(?:[-_][\p{L}\p{M}]+)*)?$/u;

  readonly maxNameLength = MAX_NAME_LENGTH;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  get normalizedDisplayName(): string {
    return this.normalizeName(this.displayName);
  }

  get displayNameErrorVisible(): boolean {
    return (
      this.nameFormatInvalid ||
      (this.displayNameTouched && this.getNameError(this.displayName) !== null)
    );
  }

  get displayNameDisplayError(): string | null {
    if (this.nameFormatInvalid) {
      return this.nameErrorMessage;
    }

    if (this.displayNameTouched) {
      return this.getNameError(this.displayName);
    }

    return null;
  }

  get ageValid(): boolean {
    return this.dateOfBirthError === null;
  }

  get canContinue(): boolean {
    return this.getNameError(this.displayName) === null && this.ageValid && this.genderValid;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dateOfBirth'] && !this.isEditingDate) {
      this.syncDateInputValue();
    }

    if (changes['displayName'] && !this.nameFormatInvalid) {
      this.nameErrorMessage = this.getNameError(this.displayName) ?? NAME_ERRORS.required;
    }

    this.cdr.markForCheck();
  }

  onDisplayNameInput(value: string, event?: Event): void {
    const input = event?.target as HTMLInputElement | undefined;
    const candidate = value.slice(0, MAX_NAME_LENGTH);

    if (input && input.value !== candidate) {
      input.value = candidate;
    }

    this.displayNameTouched = true;
    this.nameFormatInvalid = false;
    this.nameErrorMessage = this.getNameError(candidate) ?? NAME_ERRORS.required;

    this.displayNameInput.emit(candidate);
    this.cdr.markForCheck();
  }

  onDisplayNameBlur(): void {
    const normalized = this.normalizeName(this.displayName);
    const changed = normalized !== this.displayName;

    this.displayNameTouched = true;

    if (changed) {
      this.displayNameInput.emit(normalized);
    }

    this.displayNameBlur.emit();

    const error = this.getNameError(normalized);

    this.nameFormatInvalid = error !== null;
    this.nameErrorMessage = error ?? NAME_ERRORS.required;

    this.cdr.markForCheck();
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  onDateInput(value: string): void {
    this.isEditingDate = true;

    const digits = value.replace(/\D/g, '').slice(0, 8);
    this.dateInputValue = this.formatDateInput(digits);

    if (digits.length < 8) {
      this.dateOfBirthChange.emit('');
      this.cdr.markForCheck();
      return;
    }

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));

    if (!this.isValidCalendarDate(day, month, year)) {
      this.dateOfBirthChange.emit('');
      this.cdr.markForCheck();
      return;
    }

    const isoDate =
      `${year.toString().padStart(4, '0')}-` +
      `${month.toString().padStart(2, '0')}-` +
      `${day.toString().padStart(2, '0')}`;

    this.dateOfBirthChange.emit(isoDate);
    this.cdr.markForCheck();
  }

  onDateBlur(): void {
    this.isEditingDate = false;
    this.syncDateInputValue();
    this.dateOfBirthBlur.emit();
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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
      } catch {}
    }

    input.click();
  }

  onGenderChange(value: Gender): void {
    if (value !== 'male' && value !== 'female') {
      return;
    }

    this.genderChange.emit(value);
    this.cdr.markForCheck();
  }

  onNext(): void {
    this.displayNameTouched = true;

    const normalized = this.normalizeName(this.displayName);

    if (normalized !== this.displayName) {
      this.displayNameInput.emit(normalized);
    }

    const nameError = this.getNameError(normalized);

    if (nameError !== null) {
      this.nameFormatInvalid = true;
      this.nameErrorMessage = nameError;
      this.cdr.markForCheck();
      return;
    }

    this.nameFormatInvalid = false;
    this.nameErrorMessage = NAME_ERRORS.required;

    if (!this.ageValid || !this.genderValid) {
      this.cdr.markForCheck();
      return;
    }

    this.next.emit();
  }

  private getNameError(value: string): string | null {
    if (!value.trim()) {
      return NAME_ERRORS.required;
    }

    if (value.length > MAX_NAME_LENGTH) {
      return NAME_ERRORS.tooLong;
    }

    if (value.startsWith(' ') || value.endsWith(' ')) {
      return NAME_ERRORS.leadingOrTrailingSpace;
    }

    if (/ {2,}/.test(value)) {
      return NAME_ERRORS.repeatedSpaces;
    }

    if (!/^[\p{L}\p{M} _-]+$/u.test(value)) {
      return NAME_ERRORS.invalidCharacters;
    }

    if (/^[-_]|[-_]$|[-_]{2,}|[-_] | [-_]/.test(value)) {
      return NAME_ERRORS.invalidSeparator;
    }

    if (value.split(' ').length > 2) {
      return NAME_ERRORS.tooManyParts;
    }

    if (!this.namePattern.test(value)) {
      return NAME_ERRORS.invalidFormat;
    }

    return null;
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

    return `${digits.slice(0, 2)}/` + `${digits.slice(2, 4)}/` + `${digits.slice(4, 8)}`;
  }

  private formatDateForDisplay(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return '';
    }

    const [, year, month, day] = match;

    return `${day}/${month}/${year}`;
  }

  private isValidCalendarDate(day: number, month: number, year: number): boolean {
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
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

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }
}