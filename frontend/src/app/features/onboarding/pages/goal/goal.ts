import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GoalQuestions } from './components/goal-questions/goal-questions';
import { GoalProfile } from './components/goal-profile/goal-profile';
import { GoalWelcome } from './components/goal-welcome/goal-welcome';
import { GoalRegister } from './components/goal-register/goal-register';
import { GoalTest } from './components/goal-test/goal-test';
import {
  EnglishLevel,
  Gender,
  GoalOption,
  LevelSource,
} from './models/goal.models';
import { PlacementTestResult } from './models/placement-test.models';
import { AuthService } from '../../../../core/services/auth.service';

const MAX_NAME_LENGTH = 32;
const USERNAME_CHECK_DEBOUNCE_MS = 400;

const NAME_ERRORS: Readonly<Record<string, string>> = {
  required: 'Գրիր քո անունը։',
  tooLong: 'Անունը չպետք է գերազանցի 32 նիշը։',
  leadingOrTrailingSpace: 'Անվան սկզբում կամ վերջում բացատներ չեն թույլատրվում։',
  repeatedSpaces: 'Անվան մասերի միջև օգտագործիր միայն մեկ բացատ։',
  invalidCharacters: 'Օգտագործիր միայն տառեր, բացատ, գծիկ կամ ընդգծման նշան։',
  invalidSeparator: 'Գծիկը կամ ընդգծման նշանը պետք է լինի տառերի միջև։',
  tooManyParts: 'Մուտքագրիր միայն անունդ կամ անունն ու ազգանունդ։',
  invalidFormat: 'Ստուգիր անվան գրությունը և փորձիր կրկին։',
};

const BACKEND_ERROR_MAP: Readonly<Record<string, string>> = {
  'This email is already registered.': 'Այս էլ. փոստը արդեն գրանցված է։',
  'This username is already taken.': 'Այս օգտանունը զբաղված է։',
  'This password is too common.': 'Այս գաղտնաբառը շատ տարածված է։ Ընտրիր ավելի բարդ։',
  'This password is too short. It must contain at least 8 characters.': 'Գաղտնաբառը պետք է պարունակի առնվազն 8 նիշ։',
  'This password is entirely numeric.': 'Գաղտնաբառը չի կարող բաղկացած լինել միայն թվերից։',
  'The password is too similar to the username.': 'Գաղտնաբառը շատ նման է օգտանունին։ Ընտրիր ուրիշ։',
  'Passwords do not match.': 'Գաղտնաբառերը չեն համընկնում։',
  'Invalid email or password.': 'Սխալ էլ. փոստ կամ գաղտնաբառ։',
};

function translateError(msg: string): string {
  return BACKEND_ERROR_MAP[msg] ?? msg;
}

@Component({
  selector: 'app-goal',
  standalone: true,
  imports: [GoalQuestions, GoalProfile, GoalWelcome, GoalRegister, GoalTest],
  templateUrl: './goal.html',
  styleUrl: './goal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Goal {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private currentStepValue = 1;
  private showWelcomeValue = false;
  private showPlacementTestValue = false;

  protected get currentStep(): number { return this.currentStepValue; }
  protected set currentStep(value: number) {
    this.currentStepValue = value;
    this.scrollToTop();
  }

  protected get showWelcome(): boolean { return this.showWelcomeValue; }
  protected set showWelcome(value: boolean) {
    this.showWelcomeValue = value;
    this.scrollToTop();
  }

  protected get showPlacementTest(): boolean { return this.showPlacementTestValue; }
  protected set showPlacementTest(value: boolean) {
    this.showPlacementTestValue = value;
    this.scrollToTop();
  }

  protected selectedGoal: GoalOption | null = null;
  protected selectedLevel: EnglishLevel | null = null;
  protected levelSource: LevelSource | null = null;
  protected placementTestResult: PlacementTestResult | null = null;

  protected username = '';
  protected displayName = '';
  protected dateOfBirth = '';
  protected gender: Gender | null = null;

  protected email = '';
  protected password = '';
  protected passwordConfirm = '';

  protected usernameChecking = false;
  protected usernameAvailable = false;

  protected usernameTouched = false;
  protected emailTouched = false;
  protected passwordTouched = false;
  protected passwordConfirmTouched = false;

  protected displayNameTouched = false;
  protected dateOfBirthTouched = false;
  protected genderTouched = false;

  protected registrationSubmitting = false;
  protected registrationError: string | null = null;
  protected registrationFieldErrors: Record<string, string[]> = {};

  private usernameCheckToken = 0;
  private usernameCheckTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly namePattern =
    /^[\p{L}\p{M}]+(?:[-_][\p{L}\p{M}]+)*(?: [\p{L}\p{M}]+(?:[-_][\p{L}\p{M}]+)*)?$/u;

  private scrollToTop(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      });
    });
  }

  private scrollToSelectedLevel(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.querySelector('.goal__option--selected') as HTMLElement | null;
        if (!target) { this.scrollToTop(); return; }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  protected selectGoal(goal: GoalOption): void { this.selectedGoal = goal; }

  protected selectLevel(level: EnglishLevel): void {
    this.selectedLevel = level;
    this.levelSource = 'self';
    this.placementTestResult = null;
  }

  protected selectUnknownLevel(): void {
    this.selectedLevel = null;
    this.levelSource = 'unknown';
    this.placementTestResult = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.querySelector('.goal__placement') as HTMLElement | null;
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  protected startPlacementTest(): void { this.showPlacementTest = true; }
  protected skipPlacementTest(): void { this.levelSource = 'unknown'; }

  protected onPlacementCompleted(result: PlacementTestResult): void {
    this.placementTestResult = result;
    this.selectedLevel = result.level;
    this.levelSource = 'test';
    this.showPlacementTestValue = false;
    this.scrollToSelectedLevel();
  }

  protected onPlacementCancelled(): void {
    this.showPlacementTestValue = false;
    if (this.levelSource === 'test') {
      this.selectedLevel = null;
      this.levelSource = 'unknown';
      this.placementTestResult = null;
    }
    this.scrollToTop();
  }

  protected nextStep(): void {
    if (this.showWelcome) {
      this.showWelcome = false;
      this.currentStep = 4;
      return;
    }
    if (this.currentStep === 1) {
      if (!this.selectedGoal) return;
      this.currentStep = 2;
      return;
    }
    if (this.currentStep === 2) {
      this.finish();
      return;
    }
    if (this.currentStep === 3) {
      this.displayNameTouched = true;
      this.dateOfBirthTouched = true;
      this.genderTouched = true;
      this.continueProfile();
    }
  }

  protected previousStep(): void {
    if (this.showWelcome) {
      this.showWelcome = false;
      this.currentStep = 3;
      return;
    }
    if (this.currentStep === 4) {
      this.showWelcome = true;
      return;
    }
    if (this.currentStep === 3) {
      this.currentStep = 2;
      return;
    }
    if (this.currentStep === 2) {
      this.currentStep = 1;
    }
  }

  protected onDisplayNameInput(value: string): void {
    this.displayName = value.slice(0, MAX_NAME_LENGTH);
  }

  protected onDisplayNameBlur(): void {
    this.displayNameTouched = true;
    this.displayName = this.displayName.trim().replace(/\s+/g, ' ');
  }

  protected isDisplayNameValid(): boolean { return this.getDisplayNameError() === null; }

  protected getDisplayNameError(): string | null {
    const name = this.displayName;
    if (!name.trim()) return NAME_ERRORS['required'];
    if (name.length > MAX_NAME_LENGTH) return NAME_ERRORS['tooLong'];
    if (name.startsWith(' ') || name.endsWith(' ')) return NAME_ERRORS['leadingOrTrailingSpace'];
    if (/ {2,}/.test(name)) return NAME_ERRORS['repeatedSpaces'];
    if (!/^[\p{L}\p{M} _-]+$/u.test(name)) return NAME_ERRORS['invalidCharacters'];
    if (/^[-_]|[-_]$|[-_]{2,}|[-_] | [-_]/.test(name)) return NAME_ERRORS['invalidSeparator'];
    if (name.split(' ').length > 2) return NAME_ERRORS['tooManyParts'];
    if (!this.namePattern.test(name)) return NAME_ERRORS['invalidFormat'];
    return null;
  }

  protected onDateOfBirthChange(value: string): void { this.dateOfBirth = value; }
  protected onDateOfBirthBlur(): void { this.dateOfBirthTouched = true; }
  protected isAgeValid(): boolean { return this.getDateOfBirthError() === null; }

  protected getDateOfBirthError(): string | null {
    if (!this.dateOfBirth) return 'Ընտրիր քո ծննդյան ամսաթիվը։';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.dateOfBirth);
    if (!match) return 'Մուտքագրիր վավեր ծննդյան ամսաթիվ։';
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    if (year < 1900 || year > today.getFullYear() || birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return 'Ընտրիր գոյություն ունեցող և ճիշտ ամսաթիվ։';
    if (birthDate > today) return 'Ծննդյան ամսաթիվը չի կարող լինել ապագայում։';
    let age = today.getFullYear() - year;
    if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--;
    if (age < 7) return 'Գրանցվելու համար պետք է լինես առնվազն 7 տարեկան։';
    if (age > 120) return 'Խնդրում ենք մուտքագրել իրական և վավեր ծննդյան ամսաթիվ։';
    return null;
  }

  protected onGenderChange(value: Gender): void { this.gender = value; }
  protected onGenderBlur(): void { this.genderTouched = true; }
  protected isGenderValid(): boolean { return this.gender !== null; }

  protected onEmailChange(value: string): void {
    this.email = value;
    this.emailTouched = true;
    this.registrationFieldErrors['email'] = [];
  }

  protected isEmailFormatValid(): boolean {
    const email = this.email.trim();
    if (!email || email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected getEmailError(): string | null {
    if (!this.emailTouched) return null;
    if (!this.email) return 'Մուտքագրիր էլ. փոստդ։';
    if (!this.isEmailFormatValid()) return 'Մուտքագրիր վավեր էլ. փոստ։';
    return null;
  }

  protected onPasswordChange(value: string): void {
    this.password = value;
    this.passwordTouched = true;
    this.registrationFieldErrors['password'] = [];
  }

  protected isPasswordValid(): boolean {
    return this.password.length >= 8 && this.password.length <= 128 && !/\s/.test(this.password);
  }

  protected getPasswordError(): string | null {
    if (!this.passwordTouched) return null;
    if (!this.password) return 'Մուտքագրիր գաղտնաբառդ։';
    if (this.password.length < 8) return 'Գաղտնաբառը պետք է պարունակի առնվազն 8 նիշ։';
    if (/\s/.test(this.password)) return 'Գաղտնաբառը չի կարող պարունակել բացատներ։';
    if (/^\d+$/.test(this.password)) return 'Գաղտնաբառը չի կարող բաղկացած լինել միայն թվերից։';

    const pwd = this.password.toLowerCase();
    const uname = this.username.toLowerCase();
    if (uname.length > 2 && pwd.includes(uname)) {
      return 'Գաղտնաբառը շատ նման է օգտանունին։ Ընտրիր ուրիշ։';
    }
    return null;
  }

  protected onPasswordConfirmChange(value: string): void {
    this.passwordConfirm = value;
    this.passwordConfirmTouched = true;
    this.registrationFieldErrors['password_confirm'] = [];
  }

  protected getPasswordConfirmError(): string | null {
    if (!this.passwordConfirmTouched) return null;
    if (!this.passwordConfirm) return 'Կրկնիր գաղտնաբառը։';
    if (this.password !== this.passwordConfirm) return 'Գաղտնաբառերը չեն համընկնում։';
    return null;
  }

  protected isUsernameFormatValid(): boolean {
    const value = this.username;
    if (value.length < 3 || value.length > 30) return false;
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) return false;
    if (/__/.test(value)) return false;
    if (/_$/.test(value)) return false;
    return true;
  }

  protected getUsernameServerError(): string | null {
    if (!this.usernameTouched) return null;
    if (!this.isUsernameFormatValid()) return null;
    if (this.usernameChecking) return null;

    const serverErrors = this.registrationFieldErrors['username'];
    if (serverErrors && serverErrors.length > 0) return serverErrors[0];

    if (!this.usernameAvailable) {
      return 'Այս օգտանունը զբաղված է։ Փորձիր մեկ այլ։';
    }
    return null;
  }

  protected isRegistrationValid(): boolean {
    return (
      this.isDisplayNameValid() &&
      this.isAgeValid() &&
      this.isGenderValid() &&
      this.isUsernameFormatValid() &&
      this.usernameAvailable &&
      !this.usernameChecking &&
      this.isEmailFormatValid() &&
      this.isPasswordValid() &&
      this.getPasswordError() === null &&
      this.password === this.passwordConfirm &&
      this.passwordConfirm.length > 0
    );
  }

  protected onUsernameChange(value: string): void {
    this.username = value;
    this.usernameTouched = true;
    this.usernameAvailable = false;
    this.usernameChecking = false;
    this.registrationFieldErrors['username'] = [];

    if (this.usernameCheckTimer !== null) {
      clearTimeout(this.usernameCheckTimer);
      this.usernameCheckTimer = null;
    }

    if (!this.isUsernameFormatValid()) {
      this.usernameCheckToken++;
      this.cdr.markForCheck();
      return;
    }

    this.usernameChecking = true;
    this.cdr.markForCheck();
    const token = ++this.usernameCheckToken;

    this.usernameCheckTimer = setTimeout(() => {
      this.usernameCheckTimer = null;
      this.authService.isUsernameAvailable(value).subscribe({
        next: (result) => {
          if (token !== this.usernameCheckToken) return;
          this.usernameAvailable = result.available;
          this.usernameChecking = false;
          this.cdr.markForCheck();
        },
        error: () => {
          if (token !== this.usernameCheckToken) return;
          this.usernameAvailable = false;
          this.usernameChecking = false;
          this.cdr.markForCheck();
        },
      });
    }, USERNAME_CHECK_DEBOUNCE_MS);
  }

  protected finish(): void {
    if (!this.selectedGoal || this.levelSource === null) return;
    this.currentStep = 3;
  }

  protected continueProfile(): void {
    if (!this.isDisplayNameValid() || !this.isAgeValid() || !this.isGenderValid() || this.gender === null) return;
    this.showWelcome = true;
  }

  protected registerWithGoogle(): void {}

  protected register(): void {
    if (!this.isRegistrationValid() || this.gender === null) return;

    this.registrationSubmitting = true;
    this.registrationError = null;
    this.registrationFieldErrors = {};
    this.cdr.markForCheck();

    const payload = {
      email: this.email.trim(),
      username: this.username.trim().toLowerCase(),
      display_name: this.displayName.trim(),
      date_of_birth: this.dateOfBirth,
      gender: this.gender,
      password: this.password,
      password_confirm: this.passwordConfirm,
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.registrationSubmitting = false;
        this.cdr.markForCheck();
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.registrationSubmitting = false;

        const fieldErrors = this.extractFieldErrors(error);
        this.registrationFieldErrors = fieldErrors;

        const hasFieldErrors = Object.values(fieldErrors).some((arr) => arr.length > 0);
        this.registrationError = hasFieldErrors ? null : this.extractErrorMessage(error);

        if (fieldErrors['email'] && fieldErrors['email'].length > 0) this.emailTouched = true;
        if (fieldErrors['password'] && fieldErrors['password'].length > 0) this.passwordTouched = true;
        if (fieldErrors['password_confirm'] && fieldErrors['password_confirm'].length > 0) this.passwordConfirmTouched = true;
        if (fieldErrors['username'] && fieldErrors['username'].length > 0) this.usernameTouched = true;

        this.cdr.markForCheck();
      },
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const body = (error as { error: unknown }).error;
      if (body && typeof body === 'object' && 'detail' in body && typeof (body as { detail: unknown }).detail === 'string') {
        return translateError((body as { detail: string }).detail);
      }
    }
    return 'Չհաջողվեց գրանցվել։ Խնդրում ենք փորձել կրկին։';
  }

  private extractFieldErrors(error: unknown): Record<string, string[]> {
    if (!error || typeof error !== 'object' || !('error' in error)) return {};
    const body = (error as { error: unknown }).error;
    if (!body || typeof body !== 'object') return {};

    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (key === 'detail') continue;

      let mappedKey = key;
      if (key === 'non_field_errors') {
        if (Array.isArray(value) && value.some(v => String(v).includes('similar to the username'))) {
          mappedKey = 'password';
        } else if (Array.isArray(value) && value.some(v => String(v).includes('Passwords do not match'))) {
          mappedKey = 'password_confirm';
        }
      }

      if (Array.isArray(value)) {
        result[mappedKey] = (result[mappedKey] || []).concat(value.map((v) => translateError(String(v))));
      } else if (typeof value === 'string') {
        result[mappedKey] = (result[mappedKey] || []).concat([translateError(value)]);
      }
    }
    return result;
  }
}