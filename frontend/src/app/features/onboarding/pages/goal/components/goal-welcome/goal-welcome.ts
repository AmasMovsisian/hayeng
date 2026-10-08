import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { EnglishLevel, Gender, GoalOption } from '../../models/goal.models';
@Component({
  selector: 'app-goal-welcome',
  standalone: true,
  templateUrl: './goal-welcome.html',
  styleUrl: './goal-welcome.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalWelcome implements OnInit, OnDestroy {
  @Input() username = '';
  @Input() dateOfBirth = '';
  @Input() gender: Gender | null = null;
  @Input() selectedGoal: GoalOption | null = null;
  @Input() selectedLevel: EnglishLevel | null = null;
  @Input() age: number | null = null;
  @Output() next = new EventEmitter<void>();
  isLoading = true;
  isLoadingLeaving = false;
  profileEntering = false;
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private profileTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.loadingTimer = setTimeout(() => {
      this.isLoadingLeaving = true;
      this.changeDetectorRef.markForCheck();
      this.transitionTimer = setTimeout(() => {
        this.isLoading = false;
        this.profileEntering = true;
        this.changeDetectorRef.markForCheck();
        this.profileTimer = setTimeout(() => {
          this.profileEntering = false;
          this.changeDetectorRef.markForCheck();
        }, 900);
      }, 300);
    }, 3500);
  }
  ngOnDestroy(): void {
    if (this.loadingTimer !== null) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    if (this.profileTimer !== null) {
      clearTimeout(this.profileTimer);
      this.profileTimer = null;
    }
  }
  get displayName(): string {
    const value = this.username.trim();
    if (!value) return '—';
    return this.transliterateName(value);
  }
  get displayAge(): string {
    if (this.age === null || this.age === undefined) return '—';
    return `${this.age} տարեկան`;
  }
  get displayGender(): string {
    if (!this.gender) return '—';
    const value = String(this.gender).trim().toLowerCase();
    const genders: Record<string, string> = {
      male: 'Արական',
      man: 'Արական',
      m: 'Արական',
      female: 'Իգական',
      woman: 'Իգական',
      f: 'Իգական',
    };
    return genders[value] ?? this.getObjectLabel(this.gender);
  }
  get displayGoal(): string {
    if (!this.selectedGoal) return '—';
    const rawValue = this.getObjectLabel(this.selectedGoal).trim();
    if (!rawValue) return '—';
    const normalizedValue = this.normalizeGoalValue(rawValue);
    const goals: Record<string, string> = {
      career: 'Կարիերա',
      work: 'Աշխատանք',
      job: 'Աշխատանք',
      employment: 'Աշխատանք',
      travel: 'Ճամփորդություն',
      traveling: 'Ճամփորդություն',
      tourism: 'Ճամփորդություն',
      education: 'Կրթություն',
      study: 'Ուսում',
      studies: 'Ուսում',
      learning: 'Ուսում',
      communication: 'Շփում',
      social: 'Շփում',
      speaking: 'Շփում',
      conversation: 'Շփում',
      personal: 'Անձնական զարգացում',
      development: 'Անձնական զարգացում',
      self_development: 'Անձնական զարգացում',
      self_improvement: 'Անձնական զարգացում',
      personal_development: 'Անձնական զարգացում',
      personal_growth: 'Անձնական զարգացում',
      self_growth: 'Անձնական զարգացում',
      other: 'Այլ',
    };
    return goals[normalizedValue] ?? rawValue;
  }
  get displayLevel(): string {
    if (!this.selectedLevel) return '—';
    const rawValue = this.getObjectLabel(this.selectedLevel).trim();
    if (!rawValue) return '—';
    const value = rawValue.toLowerCase().trim().replace(/\s+/g, '');
    const levels: Record<string, string> = {
      a1: 'Սկսնակ / A1',
      a2: 'Տարրական / A2',
      b1: 'Միջին / B1',
      b2: 'Միջինից բարձր / B2',
      c1: 'Բարձր / C1',
      c2: 'Գերազանց / C2',
      beginner: 'Սկսնակ / A1',
      elementary: 'Տարրական / A2',
      intermediate: 'Միջին / B1',
      upperintermediate: 'Միջինից բարձր / B2',
      advanced: 'Բարձր / C1',
      unknown: 'Չգիտեմ իմ մակարդակը',
    };
    return levels[value] ?? rawValue;
  }
  private normalizeGoalValue(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_');
  }
  private getObjectLabel(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>;
      const label =
        object['label'] ??
        object['name'] ??
        object['title'] ??
        object['value'] ??
        object['id'] ??
        object['key'];
      if (typeof label === 'string') return label;
      if (typeof label === 'number') return String(label);
    }
    return String(value);
  }
  private transliterateName(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z\s'-]/g, '');
    if (!normalized) return value;
    const words = normalized.split(/(\s+|-|')/);
    return words
      .map((word) => {
        if (/^\s+$/.test(word) || word === '-' || word === "'") return word;
        return this.transliterateWord(word);
      })
      .join('');
  }
  private transliterateWord(word: string): string {
    let result = '';
    let index = 0;
    while (index < word.length) {
      const remaining = word.slice(index);
      const multi: Array<[string, string]> = [
        ['you', 'յու'],
        ['shch', 'շչ'],
        ['tch', 'տչ'],
        ['dzh', 'ջ'],
        ['yu', 'յու'],
        ['ya', 'յա'],
        ['yo', 'յո'],
        ['ye', 'յե'],
        ['kh', 'խ'],
        ['gh', 'ղ'],
        ['ch', 'չ'],
        ['sh', 'շ'],
        ['ts', 'ց'],
        ['dz', 'ձ'],
        ['zh', 'ժ'],
        ['th', 'թ'],
        ['ph', 'ֆ'],
        ['oo', 'ու'],
        ['ee', 'ի'],
      ];
      let matched = false;
      for (const [latin, armenian] of multi) {
        if (remaining.startsWith(latin)) {
          result += armenian;
          index += latin.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      const mappings: Record<string, string> = {
        a: 'ա',
        b: 'բ',
        c: 'կ',
        d: 'դ',
        e: 'ե',
        f: 'ֆ',
        g: 'գ',
        h: 'հ',
        i: 'ի',
        j: 'ջ',
        k: 'կ',
        l: 'լ',
        m: 'մ',
        n: 'ն',
        o: 'ո',
        p: 'պ',
        q: 'ք',
        r: 'ր',
        s: 'ս',
        t: 'տ',
        u: 'ու',
        v: 'վ',
        w: 'վ',
        x: 'քս',
        y: 'յ',
        z: 'զ',
      };
      const character = word[index];
      result += mappings[character] ?? character;
      index++;
    }
    return this.capitalizeArmenian(result);
  }
  private capitalizeArmenian(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
