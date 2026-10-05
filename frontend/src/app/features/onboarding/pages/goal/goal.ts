import {
ChangeDetectionStrategy,
Component,
} from '@angular/core';

type GoalOption =
| 'career'
| 'travel'
| 'communication'
| 'self-development';

type EnglishLevel =
| 'a1'
| 'a2'
| 'b1'
| 'b2'
| 'c1';

@Component({
selector: 'app-goal',
standalone: true,
templateUrl: './goal.html',
styleUrl: './goal.scss',
changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Goal {
protected currentStep = 1;

protected selectedGoal: GoalOption | null = null;

protected selectedLevel: EnglishLevel | null = null;

protected selectGoal(goal: GoalOption): void {
this.selectedGoal = goal;
}

protected selectLevel(level: EnglishLevel): void {
this.selectedLevel = level;
}

protected nextStep(): void {
if (this.currentStep === 1 && !this.selectedGoal) {
return;
}

if (this.currentStep === 2 && !this.selectedLevel) {
  return;
}

if (this.currentStep < 2) {
  this.currentStep++;
}


}

protected previousStep(): void {
if (this.currentStep > 1) {
this.currentStep--;
}
}

protected finish(): void {
if (!this.selectedGoal || !this.selectedLevel) {
return;
}

console.log('Goal:', this.selectedGoal);
console.log('English level:', this.selectedLevel);


}
}