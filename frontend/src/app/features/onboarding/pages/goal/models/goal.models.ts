export type GoalOption = 'career' | 'travel' | 'communication' | 'self-development';

export type EnglishLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1';

export type LevelSource = 'self' | 'test' | 'unknown' | 'skip' | 'later';

export type Gender = 'male' | 'female';

export interface LearningProfile {
  goal: GoalOption;
  level: EnglishLevel | null;
  levelSource: LevelSource;
}

export interface UserProfile {
  username: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
}

export interface RegistrationProfile {
  email: string;
  password: string;
}

export type PlacementLevel = EnglishLevel;
