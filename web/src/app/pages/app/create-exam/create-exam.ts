import {ChangeDetectionStrategy, Component, computed, inject, model, signal} from '@angular/core';
import {PageHeader} from "../../../components/page-header/page-header";
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {LiveAnnouncer} from '@angular/cdk/a11y';
import {Observable} from 'rxjs';
import {Skill} from '../../../api/api.types';
import {SkillsService} from '../../../services/skills/skills';
import {AsyncPipe} from '@angular/common';

export interface Fruit {
  name: string;
}

@Component({
  selector: 'app-create-exam',
  imports: [PageHeader, MatFormFieldModule, MatAutocompleteModule, MatChipsModule, MatIconModule, FormsModule, AsyncPipe, ReactiveFormsModule],
  templateUrl: './create-exam.html',
  styleUrl: './create-exam.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateExam {
  readonly formGroup = new FormGroup({
    skills: new FormControl<Skill[]>([])
  })

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly currentFruit = model('');
  readonly fruits = signal(['Lemon']);
  readonly allFruits: string[] = ['Apple', 'Lemon', 'Lime', 'Orange', 'Strawberry'];
  readonly filteredFruits = computed(() => {
    const currentFruit = this.currentFruit().toLowerCase();
    return currentFruit
      ? this.allFruits.filter(fruit => fruit.toLowerCase().includes(currentFruit))
      : this.allFruits.slice();
  });

  readonly announcer = inject(LiveAnnouncer);
  private readonly skillsService = inject(SkillsService);
  readonly skills$: Observable<Skill[]> = this.skillsService.skills$

  constructor() {
    this.skillsService.fetchSkills()
  }

  add(event: MatChipInputEvent): void {
    // If you want "free solo" typing, you need a way to map the typed string to a Skill.
    // For now we only add via autocomplete selection.
    event.chipInput?.clear();
  }

  remove(skill: Skill): void {
    const current = this.formGroup.controls.skills.value ?? [];
    this.formGroup.controls.skills.patchValue(current.filter((s) => s.id !== skill.id));
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const picked = event.option.value as Skill;
    const current = this.formGroup.controls.skills.value ?? [];
    const next = current.some((s) => s.id === picked.id) ? current : [...current, picked];
    this.formGroup.controls.skills.patchValue(next);
    event.option.deselect();
  }
}
