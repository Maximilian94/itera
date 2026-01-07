import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateExamDialog } from './create-exam-dialog';

describe('CreateExamDialog', () => {
  let component: CreateExamDialog;
  let fixture: ComponentFixture<CreateExamDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateExamDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateExamDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
