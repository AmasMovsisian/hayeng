import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GoalQuestions } from './components/goal-questions/goal-questions';
import { GoalProfile } from './components/goal-profile/goal-profile';
import { GoalWelcome } from './components/goal-welcome/goal-welcome';
import { GoalRegister } from './components/goal-register/goal-register';
import { GoalTest } from './components/goal-test/goal-test';
import {
  EnglishLevel,
  Gender,
  GoalOption,
  LearningProfile,
  LevelSource,
  RegistrationProfile,
  UserProfile,
} from './models/goal.models';
import { PlacementTestResult } from './models/placement-test.models';

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

const MOCK_TAKEN_USERNAMES: ReadonlySet<string> = new Set([
  'admin',
  'hayeng',
  'hayk',
  'support',
  'test',
  'user',
  'hello',
]);

function mockCheckUsernameAvailability(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(!MOCK_TAKEN_USERNAMES.has(normalized));
    }, 350);
  });
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
  private currentStepValue = 1;
  private showWelcomeValue = false;
  private showPlacementTestValue = false;

  protected get currentStep(): number {
    return this.currentStepValue;
  }

  protected set currentStep(value: number) {
    this.currentStepValue = value;
    this.scrollToTop();
  }

  protected get showWelcome(): boolean {
    return this.showWelcomeValue;
  }

  protected set showWelcome(value: boolean) {
    this.showWelcomeValue = value;
    this.scrollToTop();
  }

  protected get showPlacementTest(): boolean {
    return this.showPlacementTestValue;
  }

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
  protected displayNameTouched = false;
  protected dateOfBirthTouched = false;
  protected genderTouched = false;

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

        if (!target) {
          this.scrollToTop();
          return;
        }

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  protected selectGoal(goal: GoalOption): void {
    this.selectedGoal = goal;
  }

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

  protected startPlacementTest(): void {
    this.showPlacementTest = true;
  }

  protected skipPlacementTest(): void {
    this.levelSource = 'unknown';
  }

  protected laterPlacementTest(): void {
    this.levelSource = 'unknown';
  }

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
      if (!this.selectedGoal) {
        return;
      }
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

  protected isDisplayNameValid(): boolean {
    return this.getDisplayNameError() === null;
  }

  protected getDisplayNameError(): string | null {
    const name = this.displayName;

    if (!name.trim()) {
      return NAME_ERRORS['required'];
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NAME_ERRORS['tooLong'];
    }

    if (name.startsWith(' ') || name.endsWith(' ')) {
      return NAME_ERRORS['leadingOrTrailingSpace'];
    }

    if (/ {2,}/.test(name)) {
      return NAME_ERRORS['repeatedSpaces'];
    }

    if (!/^[\p{L}\p{M} _-]+$/u.test(name)) {
      return NAME_ERRORS['invalidCharacters'];
    }

    if (/^[-_]|[-_]$|[-_]{2,}|[-_] | [-_]/.test(name)) {
      return NAME_ERRORS['invalidSeparator'];
    }

    if (name.split(' ').length > 2) {
      return NAME_ERRORS['tooManyParts'];
    }

    if (!this.namePattern.test(name)) {
      return NAME_ERRORS['invalidFormat'];
    }

    return null;
  }

  protected onDateOfBirthChange(value: string): void {
    this.dateOfBirth = value;
  }

  protected onDateOfBirthBlur(): void {
    this.dateOfBirthTouched = true;
  }

  protected isAgeValid(): boolean {
    return this.getDateOfBirthError() === null;
  }

  protected getDateOfBirthError(): string | null {
    if (!this.dateOfBirth) {
      return 'Ընտրիր քո ծննդյան ամսաթիվը։';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.dateOfBirth);

    if (!match) {
      return 'Մուտքագրիր վավեր ծննդյան ամսաթիվ։';
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);

    if (
      year < 1900 ||
      year > today.getFullYear() ||
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) {
      return 'Ընտրիր գոյություն ունեցող և ճիշտ ամսաթիվ։';
    }

    if (birthDate > today) {
      return 'Ծննդյան ամսաթիվը չի կարող լինել ապագայում։';
    }

    let age = today.getFullYear() - year;

    if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) {
      age--;
    }

    if (age < 7) {
      return 'Գրանցվելու համար պետք է լինես առնվազն 7 տարեկան։';
    }

    if (age > 120) {
      return 'Խնդրում ենք մուտքագրել իրական և վավեր ծննդյան ամսաթիվ։';
    }

    return null;
  }

  protected onGenderChange(value: Gender): void {
    this.gender = value;
  }

  protected onGenderBlur(): void {
    this.genderTouched = true;
  }

  protected isGenderValid(): boolean {
    return this.gender !== null;
  }

  protected isValidEmail(): boolean {
    const email = this.email.trim();

    if (!email || email.length > 254) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected isPasswordValid(): boolean {
    return this.password.length >= 8 && this.password.length <= 128 && !/\s/.test(this.password);
  }

  protected isUsernameFormatValid(): boolean {
    const value = this.username;

    if (value.length < 3 || value.length > 30) {
      return false;
    }

    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
      return false;
    }

    if (/__/.test(value)) {
      return false;
    }

    if (/_$/.test(value)) {
      return false;
    }

    return true;
  }

  protected isRegistrationValid(): boolean {
    return (
      this.isDisplayNameValid() &&
      this.isAgeValid() &&
      this.isGenderValid() &&
      this.isUsernameFormatValid() &&
      this.usernameAvailable &&
      !this.usernameChecking &&
      this.isValidEmail() &&
      this.isPasswordValid() &&
      this.passwordConfirm.length >= 8 &&
      this.password === this.passwordConfirm
    );
  }

  protected onUsernameChange(value: string): void {
    this.username = value;
    this.usernameTouched = true;
    this.usernameAvailable = false;
    this.usernameChecking = false;

    if (this.usernameCheckTimer !== null) {
      clearTimeout(this.usernameCheckTimer);
      this.usernameCheckTimer = null;
    }

    if (!this.isUsernameFormatValid()) {
      this.usernameCheckToken++;
      return;
    }

    this.usernameChecking = true;
    const token = ++this.usernameCheckToken;

    this.usernameCheckTimer = setTimeout(() => {
      this.usernameCheckTimer = null;

      mockCheckUsernameAvailability(value).then((available) => {
        if (token !== this.usernameCheckToken) {
          return;
        }
        this.usernameAvailable = available;
        this.usernameChecking = false;
      });
    }, USERNAME_CHECK_DEBOUNCE_MS);
  }

  protected finish(): void {
    if (!this.selectedGoal || this.levelSource === null) {
      return;
    }

    const learningProfile: LearningProfile = {
      goal: this.selectedGoal,
      level: this.selectedLevel,
      levelSource: this.levelSource,
    };

    console.log('Learning profile:', learningProfile);
    this.currentStep = 3;
  }

  protected continueProfile(): void {
    if (!this.isDisplayNameValid() || !this.isAgeValid() || !this.isGenderValid()) {
      return;
    }

    if (this.gender === null) {
      return;
    }

    const userProfile: UserProfile = {
      username: '',
      displayName: this.displayName,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
    };

    console.log('User profile:', userProfile);
    this.showWelcome = true;
  }

  protected registerWithGoogle(): void {
    console.log('Google registration will start');
  }

  protected register(): void {
    if (!this.isRegistrationValid() || this.gender === null) {
      return;
    }

    const registrationProfile: RegistrationProfile = {
      email: this.email.trim(),
      password: this.password,
    };

    const onboardingProfile = {
      username: this.username,
      displayName: this.displayName,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      learning: {
        goal: this.selectedGoal,
        level: this.selectedLevel,
        levelSource: this.levelSource,
        placementScore: this.placementTestResult?.score ?? null,
      },
      registration: {
        email: registrationProfile.email,
      },
    };

    console.log('Registration profile:', registrationProfile);
    console.log('Complete onboarding profile:', onboardingProfile);
  }
}
