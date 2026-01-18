import {ChangeDetectionStrategy, Component} from '@angular/core';
import { FontAwesomeModule, IconDefinition} from '@fortawesome/angular-fontawesome';
import { faHome, faClockRotateLeft, faTags } from '@fortawesome/free-solid-svg-icons';
import {Divider} from 'primeng/divider';
import {LINK} from '../../app.routes';
import {SideBarNavButton} from './side-bar-nav-button/side-bar-nav-button';

interface NavButtonData {
  path: string[],
  label: string,
  icon: IconDefinition,
}


@Component({
  selector: 'app-side-bar',
  imports: [
    FontAwesomeModule,
    Divider,
    SideBarNavButton,
  ],
  templateUrl: './side-bar.component.html',
  styleUrl: './side-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideBar {
  protected readonly navButtonsData:NavButtonData[] = [
    {
      path: [...LINK.home] as string[],
      label: 'Home',
      icon: faHome,
    },
    {
      path: [...LINK.history] as string[],
      label: 'History',
      icon: faClockRotateLeft,
    },
    {
      path: [...LINK.tags] as string[],
      label: 'Skills',
      icon: faTags,
    }
  ];
}
