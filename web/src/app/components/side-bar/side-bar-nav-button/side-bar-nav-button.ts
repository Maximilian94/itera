import { Component, Input} from '@angular/core';
import {ButtonModule} from "primeng/button";
import {FaIconComponent, IconDefinition} from "@fortawesome/angular-fontawesome";
import {RouterLink, RouterLinkActive} from "@angular/router";

@Component({
  selector: 'app-side-bar-nav-button',
  imports: [
    ButtonModule,
      FaIconComponent,
      RouterLinkActive,
    RouterLink
  ],
  templateUrl: './side-bar-nav-button.html',
  styleUrl: './side-bar-nav-button.scss',
})
export class SideBarNavButton {
  @Input({required: true}) label!: string;
  @Input({required: true})  iconDefinition!:  IconDefinition;
  @Input({required: true}) link!: string[];
}
