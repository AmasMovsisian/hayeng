import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EnglishLevel, GoalOption, LevelSource } from '../../models/goal.models';
import { AppFooter } from '../../../../../../shared/app-footer/app-footer';

@Component({
  selector: 'app-goal-questions',
  standalone: true,
  imports: [AppFooter],
  templateUrl: './goal-questions.html',
  styleUrl: './goal-questions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalQuestions implements AfterViewInit, OnChanges {
  @ViewChild('stepWrapper', { read: ElementRef }) stepWrapper?: ElementRef<HTMLElement>;

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

  protected placementPanelVisible = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    this.scrollToTop(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      this.scrollToTop(true);
      this.placementPanelVisible = false;
    }

    if (changes['levelSource']) {
      this.placementPanelVisible = this.levelSource === 'unknown';
    }
  }

  protected isPlacementPanelVisible(): boolean {
    return this.levelSource === 'unknown' || this.placementPanelVisible;
  }

  protected isUnknownSelected(): boolean {
    return this.levelSource === 'unknown';
  }

  protected isSkipSelected(): boolean {
    return false;
  }

  protected isLaterSelected(): boolean {
    return false;
  }

  protected onPlacementStart(): void {
    this.placementPanelVisible = true;
    this.placementStart.emit();
  }

  protected onPlacementSkip(): void {
    this.placementPanelVisible = false;
    this.placementSkip.emit();
  }

  protected onPlacementLater(): void {
    this.placementPanelVisible = false;
    this.placementLater.emit();
  }

  private scrollToTop(smooth: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

      window.scrollTo({ top: 0, left: 0, behavior });

      const element = this.stepWrapper?.nativeElement;

      if (element) {
        element.scrollIntoView({ behavior, block: 'start' });
      }
    }, 0);
  }
}
