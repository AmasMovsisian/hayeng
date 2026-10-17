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
  protected dateOfBirth = '';
  protected gender: Gender | null = null;

  protected email = '';
  protected password = '';
  protected passwordConfirm = '';

  protected usernameTouched = false;
  protected dateOfBirthTouched = false;
  protected genderTouched = false;

  private readonly namePattern =
    /^[\p{L}\p{M}]+(?:[-_][\p{L}\p{M}]+)*(?: [\p{L}\p{M}]+(?:[-_][\p{L}\p{M}]+)*)?$/u;

  private scrollToTop(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth',
        });
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

        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.querySelector('.goal__placement') as HTMLElement | null;

        target?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    });
  }

  protected startPlacementTest(): void {
    this.showPlacementTest = true;
  }

  protected skipPlacementTest(): void {
    this.levelSource = 'skip';
  }

  protected laterPlacementTest(): void {
    this.levelSource = 'later';
  }

  protected onPlacementCompleted(result: PlacementTestResult): void {
    this.placementTestResult = result;
    this.selectedLevel = result.level;
    this.levelSource = 'test';
    this.showPlacementTestValue = false;
    this.scrollToSelectedLevel();

    console.log(
      'Estimated level:',
      result.level,
      `(${result.correctAnswers}/${result.totalQuestions}, ${result.score}%)`,
    );
  }

  protected onPlacementCancelled(): void {
    this.showPlacementTestValue = false;

    if (this.levelSource === 'test') {
      this.levelSource = 'unknown';
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
      this.usernameTouched = true;
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

  protected onUsernameInput(value: string): void {
    this.username = value.slice(0, MAX_NAME_LENGTH);
  }

  protected onUsernameBlur(): void {
    this.usernameTouched = true;
    this.normalizeUsername();
  }

  private normalizeUsername(): void {
    this.username = this.username.trim().replace(/\s+/g, ' ');
  }

  protected isUsernameValid(): boolean {
    return this.getUsernameError() === null;
  }

  protected getUsernameError(): string | null {
    const name = this.username;

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

  protected touchUsername(): void {
    this.usernameTouched = true;
  }

  protected shouldShowUsernameError(): boolean {
    return this.usernameTouched && !this.isUsernameValid();
  }

  protected onDateOfBirthChange(value: string): void {
    this.dateOfBirth = value;
  }

  protected onDateOfBirthBlur(): void {
    this.dateOfBirthTouched = true;
  }

  protected getAge(): number | null {
    if (!this.dateOfBirth) {
      return null;
    }

    const birthDate = new Date(`${this.dateOfBirth}T00:00:00`);
    const today = new Date();

    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const year = birthDate.getFullYear();
    const month = birthDate.getMonth();
    const day = birthDate.getDate();

    if (
      year < 1900 ||
      year > today.getFullYear() ||
      month < 0 ||
      month > 11 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const normalizedDate = new Date(year, month, day);

    if (
      normalizedDate.getFullYear() !== year ||
      normalizedDate.getMonth() !== month ||
      normalizedDate.getDate() !== day
    ) {
      return null;
    }

    if (birthDate > today) {
      return null;
    }

    let age = today.getFullYear() - year;
    const monthDifference = today.getMonth() - month;

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < day)) {
      age--;
    }

    return age;
  }

  protected isAgeValid(): boolean {
    const age = this.getAge();
    return age !== null && age >= 7 && age <= 120;
  }

  protected getDateOfBirthError(): string | null {
    if (!this.dateOfBirth) {
      return 'Ընտրիր քո ծննդյան ամսաթիվը։';
    }

    const birthDate = new Date(`${this.dateOfBirth}T00:00:00`);
    const today = new Date();

    if (Number.isNaN(birthDate.getTime())) {
      return 'Մուտքագրիր վավեր ծննդյան ամսաթիվ։';
    }

    const year = birthDate.getFullYear();
    const month = birthDate.getMonth();
    const day = birthDate.getDate();

    if (birthDate > today) {
      return 'Ծննդյան ամսաթիվը չի կարող լինել ապագայում։';
    }

    const normalizedDate = new Date(year, month, day);

    if (
      normalizedDate.getFullYear() !== year ||
      normalizedDate.getMonth() !== month ||
      normalizedDate.getDate() !== day
    ) {
      return 'Ընտրիր գոյություն ունեցող և ճիշտ ամսաթիվ։';
    }

    const age = this.getAge();

    if (age === null) {
      return 'Մուտքագրիր վավեր ծննդյան ամսաթիվ։';
    }

    if (age < 7) {
      return 'Գրանցվելու համար պետք է լինես առնվազն 7 տարեկան։';
    }

    if (age > 120) {
      return 'Խնդրում ենք մուտքագրել իրական և վավեր ծննդյան ամսաթիվ։';
    }

    return null;
  }

  protected touchDateOfBirth(): void {
    this.dateOfBirthTouched = true;
  }

  protected shouldShowDateOfBirthError(): boolean {
    return this.dateOfBirthTouched && !this.isAgeValid();
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

  protected isRegistrationValid(): boolean {
    return (
      this.isUsernameValid() &&
      this.isAgeValid() &&
      this.isGenderValid() &&
      this.isValidEmail() &&
      this.isPasswordValid() &&
      this.passwordConfirm.length >= 8 &&
      this.password === this.passwordConfirm
    );
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
    this.normalizeUsername();

    if (!this.isUsernameValid() || !this.isAgeValid() || !this.isGenderValid()) {
      return;
    }

    const age = this.getAge();

    if (age === null || this.gender === null) {
      return;
    }

    const userProfile: UserProfile = {
      username: this.username,
      dateOfBirth: this.dateOfBirth,
      age,
      gender: this.gender,
    };

    console.log('User profile:', userProfile);
    this.showWelcome = true;
  }

  protected registerWithGoogle(): void {
    console.log('Google registration will start');
  }

  protected register(): void {
    this.normalizeUsername();

    if (!this.isRegistrationValid()) {
      return;
    }

    const registrationProfile: RegistrationProfile = {
      email: this.email.trim(),
      password: this.password,
    };

    const age = this.getAge();

    if (age === null || this.gender === null) {
      return;
    }

    const onboardingProfile = {
      username: this.username,
      dateOfBirth: this.dateOfBirth,
      age,
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
