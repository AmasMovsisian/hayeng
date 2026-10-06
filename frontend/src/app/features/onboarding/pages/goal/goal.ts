import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { GoalQuestions } from './components/goal-questions/goal-questions';
import { GoalProfile } from './components/goal-profile/goal-profile';
import { GoalWelcome } from './components/goal-welcome/goal-welcome';
import { GoalRegister } from './components/goal-register/goal-register';
import {
  EnglishLevel,
  GoalOption,
  LearningProfile,
  PlacementTestStatus,
  RegistrationProfile,
  UserProfile,
} from './models/goal.models';

@Component({
  selector: 'app-goal',
  standalone: true,
  imports: [GoalQuestions, GoalProfile, GoalWelcome, GoalRegister],
  templateUrl: './goal.html',
  styleUrl: './goal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Goal {
  private currentStepValue = 1;

  protected get currentStep(): number {
    return this.currentStepValue;
  }

  protected set currentStep(value: number) {
    this.currentStepValue = value;
    this.scrollToTop();
  }

  protected selectedGoal: GoalOption | null = null;

  protected selectedLevel: EnglishLevel | null = null;

  protected placementTestStatus: PlacementTestStatus = 'not-started';

  protected username = '';

  protected dateOfBirth = '';

  protected email = '';

  protected password = '';

  protected passwordConfirm = '';

  protected usernameTouched = false;

  protected dateOfBirthTouched = false;

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

  protected selectGoal(goal: GoalOption): void {
    this.selectedGoal = goal;
  }

  protected selectLevel(level: Exclude<EnglishLevel, 'unknown'>): void {
    this.selectedLevel = level;
    this.placementTestStatus = 'not-needed';
  }

  protected selectUnknownLevel(): void {
    this.selectedLevel = 'unknown';
    this.placementTestStatus = 'not-started';
  }

  protected nextStep(): void {
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

      this.continueProfile();
      return;
    }

    if (this.currentStep === 4) {
      this.currentStep = 5;
      return;
    }
  }

  protected previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  protected startPlacementTest(): void {
    if (this.selectedLevel !== 'unknown') {
      return;
    }

    this.placementTestStatus = 'not-started';

    console.log('Placement test will start');
  }

  protected skipPlacementTest(): void {
    if (this.selectedLevel !== 'unknown') {
      return;
    }

    this.placementTestStatus = 'skipped';
  }

  protected laterPlacementTest(): void {
    if (this.selectedLevel !== 'unknown') {
      return;
    }

    this.placementTestStatus = 'not-started';
  }

  protected onUsernameInput(value: string): void {
    this.username = value;
  }

  protected onUsernameBlur(): void {
    this.usernameTouched = true;
  }

  protected isUsernameValid(): boolean {
    const username = this.username.trim();

    if (!username) {
      return false;
    }

    if (username.length < 3) {
      return false;
    }

    if (username.length > 60) {
      return false;
    }

    if (!/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u.test(username)) {
      return false;
    }

    if (/\s{2,}/.test(username)) {
      return false;
    }

    const words = username.split(/[ '-]/);

    if (!words.every((word) => word.length >= 2)) {
      return false;
    }

    if (words.length === 1 && words[0].length < 3) {
      return false;
    }

    return true;
  }

  protected getUsernameError(): string | null {
    const username = this.username.trim();

    if (!username) {
      return 'Գրիր քո անունը։';
    }

    if (username.length < 3) {
      return 'Անունը պետք է պարունակի առնվազն 3 տառ։';
    }

    if (username.length > 60) {
      return 'Անունը չափազանց երկար է։';
    }

    if (!/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u.test(username)) {
      return 'Օգտագործիր միայն տառեր։ Թույլատրվում են նաև բացատ, գծիկ և ապոստրոֆ։';
    }

    if (/\s{2,}/.test(username)) {
      return 'Անվան մեջ իրար հաջորդող բացատներ չեն թույլատրվում։';
    }

    const words = username.split(/[ '-]/);

    if (!words.every((word) => word.length >= 2)) {
      return 'Անվան յուրաքանչյուր մասը պետք է պարունակի առնվազն 2 տառ։';
    }

    if (words.length === 1 && words[0].length < 3) {
      return 'Անունը չափազանց կարճ է։';
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

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < day)
    ) {
      age--;
    }

    return age;
  }

  protected isAgeValid(): boolean {
    const age = this.getAge();

    if (age === null) {
      return false;
    }

    return age >= 7 && age <= 120;
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

  protected isValidEmail(): boolean {
    const email = this.email.trim();

    if (!email || email.length > 254) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected isPasswordValid(): boolean {
    if (this.password.length < 8 || this.password.length > 128) {
      return false;
    }

    if (/\s/.test(this.password)) {
      return false;
    }

    return true;
  }

  protected isRegistrationValid(): boolean {
    return (
      this.isUsernameValid() &&
      this.isAgeValid() &&
      this.isValidEmail() &&
      this.isPasswordValid() &&
      this.passwordConfirm.length >= 8 &&
      this.password === this.passwordConfirm
    );
  }

  protected finish(): void {
    if (!this.selectedGoal || !this.selectedLevel) {
      return;
    }

    if (
      this.selectedLevel === 'unknown' &&
      this.placementTestStatus === 'not-started'
    ) {
      return;
    }

    const learningProfile: LearningProfile = {
      goal: this.selectedGoal,
      selfAssessedLevel: this.selectedLevel,
      placementTestStatus: this.placementTestStatus,
    };

    console.log('Learning profile:', learningProfile);

    this.currentStep = 3;
  }

  protected continueProfile(): void {
    if (!this.isUsernameValid() || !this.isAgeValid()) {
      return;
    }

    const age = this.getAge();

    if (age === null) {
      return;
    }

    const userProfile: UserProfile = {
      username: this.username.trim(),
      dateOfBirth: this.dateOfBirth,
      age,
    };

    console.log('User profile:', userProfile);

    this.currentStep = 4;
  }

  protected registerWithGoogle(): void {
    console.log('Google registration will start');
  }

  protected register(): void {
    if (!this.isRegistrationValid()) {
      return;
    }

    const registrationProfile: RegistrationProfile = {
      email: this.email.trim(),
      password: this.password,
    };

    const age = this.getAge();

    if (age === null) {
      return;
    }

    const onboardingProfile = {
      username: this.username.trim(),
      dateOfBirth: this.dateOfBirth,
      age,
      learning: {
        goal: this.selectedGoal,
        selfAssessedLevel: this.selectedLevel,
        placementTestStatus: this.placementTestStatus,
      },
      registration: {
        email: registrationProfile.email,
      },
    };

    console.log('Registration profile:', registrationProfile);

    console.log('Complete onboarding profile:', onboardingProfile);
  }
}