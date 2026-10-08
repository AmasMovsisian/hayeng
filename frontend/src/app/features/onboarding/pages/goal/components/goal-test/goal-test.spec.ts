import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalTest } from './goal-test';

describe('GoalTest', () => {
  let component: GoalTest;
  let fixture: ComponentFixture<GoalTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalTest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
