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
import {
  EnglishLevel,
  GoalOption,
  LevelSource,
} from '../../models/goal.models';

type PlacementChoice = 'skip' | 'later' | null;

@Component({
  selector: 'app-goal-questions',
  standalone: true,
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

  protected placementChoice: PlacementChoice = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    this.scrollToTop(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      this.scrollToTop(true);
      this.placementChoice = null;
    }

    if (changes['currentStep'] || changes['levelSource']) {
      this.syncPlacementChoiceFromSource();
    }
  }

  private syncPlacementChoiceFromSource(): void {
    const s = this.levelSource;

    if (s === 'skip' || s === 'later') {
      this.placementChoice = s;
    } else if (s === 'self' || s === 'test' || s === null) {
      this.placementChoice = null;
    }
  }

  protected isPlacementPanelVisible(): boolean {
    return (
      this.levelSource === 'unknown' ||
      this.levelSource === 'skip' ||
      this.levelSource === 'later'
    );
  }

  protected isUnknownSelected(): boolean {
    return this.isPlacementPanelVisible();
  }

  protected isSkipSelected(): boolean {
    return this.placementChoice === 'skip';
  }

  protected isLaterSelected(): boolean {
    return this.placementChoice === 'later';
  }

  protected onPlacementStart(): void {
    this.placementChoice = null;
    this.placementStart.emit();
  }

  protected onPlacementSkip(): void {
    this.placementChoice = 'skip';
    this.placementSkip.emit();
  }

  protected onPlacementLater(): void {
    this.placementChoice = 'later';
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