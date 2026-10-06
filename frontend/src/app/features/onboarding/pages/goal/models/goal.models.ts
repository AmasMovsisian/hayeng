export type GoalOption = 'career' | 'travel' | 'communication' | 'self-development';

export type EnglishLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'unknown';

export type PlacementTestStatus = 'not-needed' | 'not-started' | 'completed' | 'skipped';

export interface LearningProfile {
  goal: GoalOption;
  selfAssessedLevel: EnglishLevel;
  placementTestStatus: PlacementTestStatus;
}

export interface UserProfile {
  username: string;
  dateOfBirth: string;
  age: number;
}

export interface RegistrationProfile {
  email: string;
  password: string;
}
