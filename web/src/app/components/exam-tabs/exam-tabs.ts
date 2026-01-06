import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Tab, TabList, TabPanel, TabPanels, Tabs} from 'primeng/tabs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChartLine, faComments, faNoteSticky, faPersonChalkboard, faPlay} from '@fortawesome/free-solid-svg-icons';

export type ExamTab = 'question' | 'explanation' | 'stats' | 'comments' | 'notes';

@Component({
  selector: 'app-exam-tabs',
  standalone: true,
  imports: [CommonModule, Tabs, TabList, Tab, TabPanels, TabPanel, FaIconComponent],
  templateUrl: './exam-tabs.html',
  styleUrl: './exam-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamTabs {
  @Input({ required: true }) activeTab!: ExamTab;
  @Output() tabChange = new EventEmitter<ExamTab>();
  protected readonly faPlay = faPlay;
  protected readonly faPersonChalkboard = faPersonChalkboard;
  protected readonly faChartLine = faChartLine;
  protected readonly faComments = faComments;
  protected readonly faNoteSticky = faNoteSticky;

  setTab(tab: ExamTab) {
    this.tabChange.emit(tab);
  }
}


