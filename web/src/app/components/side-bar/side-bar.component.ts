import {ChangeDetectionStrategy, Component} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHome, faClockRotateLeft, faGear } from '@fortawesome/free-solid-svg-icons';
import { RouterLink, RouterLinkActive } from '@angular/router';


@Component({
  selector: 'app-side-bar',
  imports: [
    FontAwesomeModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './side-bar.component.html',
  styleUrl: './side-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideBar {
  faHome = faHome;
  faClockRotateLeft = faClockRotateLeft;
  faGear = faGear;
}
