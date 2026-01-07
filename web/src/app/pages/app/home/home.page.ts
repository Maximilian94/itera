import {CommonModule} from '@angular/common';
import {Component, inject, signal} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {PageHeader} from '../../../components/page-header/page-header';
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {faPlay} from '@fortawesome/free-solid-svg-icons';
import {LINK} from '../../../app.routes';
import {Dialog} from 'primeng/dialog';
import {Button, ButtonIcon, ButtonLabel} from 'primeng/button';
import {CreateExamForm} from '../../../components/create-exam-form/create-exam-form';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeader,
    FontAwesomeModule,
    Dialog,
    Button,
    CreateExamForm,
    ButtonLabel,
    ButtonIcon
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  private router = inject(Router);
  protected readonly faPlay = faPlay;


  visible = signal(false);

  showDialog() {
    this.visible.set(true);
  }

  redirectToExam(examId: string) {
    this.router.navigate(LINK.exam(examId)).then(() => {});
  }
}
