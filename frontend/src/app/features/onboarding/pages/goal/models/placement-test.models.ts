
import type { PlacementLevel } from './goal.models';

export interface TestAnswer {
  id: string;
  text: string;
}

export interface TestQuestion {
  id: string;
  level: PlacementLevel;
  text: string;
  answers: TestAnswer[];
  correctAnswerId: string;
}

export interface TestUserAnswer {
  question: TestQuestion;
  selectedAnswerId: string;
  isCorrect: boolean;
}

export interface PlacementTestResult {
  level: PlacementLevel;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  userAnswers: TestUserAnswer[];
}
