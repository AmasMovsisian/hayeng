import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  inject,
} from '@angular/core';
import { PlacementLevel } from '../../models/goal.models';
import {
  PlacementTestResult,
  TestQuestion,
  TestUserAnswer,
} from '../../models/placement-test.models';
import { PLACEMENT_QUESTIONS } from '../../data/placement-questions';

type TestPhase = 'questions' | 'result' | 'review';

@Component({
  selector: 'app-goal-test',
  standalone: true,
  imports: [],
  templateUrl: './goal-test.html',
  styleUrl: './goal-test.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalTest {
  @Output() completed = new EventEmitter<PlacementTestResult>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly host = inject(ElementRef<HTMLElement>);

  protected phase: TestPhase = 'questions';
  protected readonly questions: TestQuestion[] = PLACEMENT_QUESTIONS;
  protected currentQuestionIndex = 0;
  protected selectedAnswerId: string | null = null;

  private readonly correctByLevel: Record<PlacementLevel, number> = {
    a1: 0,
    a2: 0,
    b1: 0,
    b2: 0,
    c1: 0,
  };

  private readonly totalByLevel: Record<PlacementLevel, number> = {
    a1: 0,
    a2: 0,
    b1: 0,
    b2: 0,
    c1: 0,
  };

  protected userAnswers: TestUserAnswer[] = [];
  protected result: PlacementTestResult | null = null;

  protected get currentQuestion(): TestQuestion {
    return this.questions[this.currentQuestionIndex];
  }

  protected get currentQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  protected get maxQuestions(): number {
    return this.questions.length;
  }

  protected get progress(): number {
    return (this.currentQuestionNumber / this.maxQuestions) * 100;
  }

  protected get questionLevelLabel(): string {
    return this.currentQuestion.level.toUpperCase();
  }

  protected get answers() {
    return this.currentQuestion.answers;
  }

  protected get isLastQuestion(): boolean {
    return this.currentQuestionIndex >= this.questions.length - 1;
  }

  protected selectAnswer(answerId: string): void {
    this.selectedAnswerId = answerId;
  }

  protected getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected getAnswerText(question: TestQuestion, answerId: string): string {
    const answer = question.answers.find((a) => a.id === answerId);
    return answer ? answer.text : '—';
  }

  protected nextQuestion(): void {
    if (this.selectedAnswerId === null) {
      return;
    }

    const question = this.currentQuestion;
    const selectedId = this.selectedAnswerId;
    const isCorrect = selectedId === question.correctAnswerId;

    this.totalByLevel[question.level]++;
    if (isCorrect) {
      this.correctByLevel[question.level]++;
    }

    this.userAnswers.push({
      question,
      selectedAnswerId: selectedId,
      isCorrect,
    });

    if (this.isLastQuestion) {
      this.finishTest();
      return;
    }

    this.currentQuestionIndex++;
    this.selectedAnswerId = null;
  }

  protected cancelTest(): void {
    this.cancelled.emit();
  }

  protected showReview(): void {
    this.phase = 'review';
    this.scrollToTop();
  }

  protected backToResult(): void {
    this.phase = 'result';
    this.scrollToTop();
  }

  protected confirmResult(): void {
    if (!this.result) {
      return;
    }
    this.completed.emit(this.result);
  }

  private finishTest(): void {
    this.result = this.calculateResult();
    this.phase = 'result';
    this.scrollToTop();
  }

  private scrollToTop(): void {
    setTimeout(() => {
      const el = this.host.nativeElement as HTMLElement;

      let parent: HTMLElement | null = el.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        const isScrollable =
          (overflowY === 'auto' ||
            overflowY === 'scroll' ||
            overflowY === 'overlay') &&
          parent.scrollHeight > parent.clientHeight;

        if (isScrollable) {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        }
        parent = parent.parentElement;
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (document.documentElement.scrollTop > 0) {
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (document.body.scrollTop > 0) {
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);
  }

  private calculateResult(): PlacementTestResult {
    const levels: PlacementLevel[] = ['c1', 'b2', 'b1', 'a2', 'a1'];
    let estimatedLevel: PlacementLevel = 'a1';

    for (const level of levels) {
      const correct = this.correctByLevel[level];
      const total = this.totalByLevel[level];
      if (total > 0 && correct / total >= 2 / 3) {
        estimatedLevel = level;
        break;
      }
    }

    const totalCorrect =
      this.correctByLevel.a1 +
      this.correctByLevel.a2 +
      this.correctByLevel.b1 +
      this.correctByLevel.b2 +
      this.correctByLevel.c1;

    const totalQuestions = this.questions.length;
    const score = Math.round((totalCorrect / totalQuestions) * 100);

    return {
      level: estimatedLevel,
      correctAnswers: totalCorrect,
      totalQuestions,
      score,
      userAnswers: this.userAnswers,
    };
  }
}