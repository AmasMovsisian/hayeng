
export const ENGLISH_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;

export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export type PlacementLevel = EnglishLevel;

export type GoalOption =
  | 'career'
  | 'travel'
  | 'communication'
  | 'self-development';

export type LevelSource = 'self' | 'test' | 'unknown';

export type Gender = 'male' | 'female';

export interface LearningProfile {
  goal: GoalOption;
  level: EnglishLevel | null;
  levelSource: LevelSource;
}

export interface UserProfile {
  username: string;
  displayName: string;
  dateOfBirth: string;
  gender: Gender | null;
}

export interface RegistrationProfile {
  email: string;
  password: string;
}
