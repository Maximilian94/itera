import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

export type ChipVariant = 'default' | 'primary' | 'success' | 'danger';
export type ChipSize = 'sm' | 'md';

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipComponent {

}


