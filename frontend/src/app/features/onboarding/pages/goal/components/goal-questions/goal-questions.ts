import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { EnglishLevel, GoalOption, PlacementTestStatus } from '../../models/goal.models';

@Component({
  selector: 'app-goal-questions',
  standalone: true,
  templateUrl: './goal-questions.html',
  styleUrl: './goal-questions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalQuestions {
  @Input() currentStep = 1;
  @Input() selectedGoal: GoalOption | null = null;
  @Input() selectedLevel: EnglishLevel | null = null;
  @Input() placementTestStatus: PlacementTestStatus = 'not-started';

  @Output() goalSelected = new EventEmitter<GoalOption>();
  @Output() levelSelected = new EventEmitter<Exclude<EnglishLevel, 'unknown'>>();
  @Output() unknownLevelSelected = new EventEmitter<void>();
  @Output() placementStart = new EventEmitter<void>();
  @Output() placementSkip = new EventEmitter<void>();
  @Output() placementLater = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}