import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  EnglishLevel,
  GoalOption,
  LevelSource,
} from '../../models/goal.models';
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
  @Input() levelSource: LevelSource | null = null;
  @Output() goalSelected = new EventEmitter<GoalOption>();
  @Output() levelSelected = new EventEmitter<EnglishLevel>();
  @Output() unknownLevelSelected = new EventEmitter<void>();
  @Output() placementStart = new EventEmitter<void>();
  @Output() placementSkip = new EventEmitter<void>();
  @Output() placementLater = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}