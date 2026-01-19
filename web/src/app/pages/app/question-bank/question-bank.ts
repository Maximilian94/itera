import { Component } from '@angular/core';
import {TableModule} from 'primeng/table';

@Component({
  selector: 'app-question-bank',
  imports: [
    TableModule
  ],
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.scss',
})
export class QuestionBank {
  products: any[] = [];
}
