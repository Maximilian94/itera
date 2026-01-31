import {CommonModule, isPlatformBrowser} from '@angular/common';
import {ChangeDetectorRef, Component, inject, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {PageHeader} from '../../../components/page-header/page-header';
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {faPlay} from '@fortawesome/free-solid-svg-icons';
import {LINK} from '../../../app.routes';
import {Button, ButtonIcon, ButtonLabel} from 'primeng/button';
import {CreateExamForm} from '../../../components/create-exam-form/create-exam-form';
import {TableModule} from 'primeng/table';
import {Badge} from 'primeng/badge';
import {Drawer} from 'primeng/drawer';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeader,
    FontAwesomeModule,
    Button,
    CreateExamForm,
    ButtonLabel,
    ButtonIcon,
    TableModule,
    Badge,
    Drawer
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  private router = inject(Router);
  protected readonly faPlay = faPlay;
  visible = signal(false);

  basicData: any;

  basicOptions: any;

  platformId = inject(PLATFORM_ID);

  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.initChart();
  }

  initChart() {
    if (isPlatformBrowser(this.platformId)) {
      const documentStyle = getComputedStyle(document.documentElement);
      const textColor = documentStyle.getPropertyValue('--p-text-color');
      const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
      const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

      this.basicData = {
        labels: [
          "Fundamentals & Architecture",
          "Reactivity & State",
          "Performance & Rendering",
          "Navigation & UX (Router)",
          "Forms & Complex UI",
          "Platform & Quality (Build/Tests)",
          "Architecture & Scale (SSR/Security)"
        ],
        datasets: [
          {
            type: 'line',
            label: 'Average',
            data: [5, 6, 4, 6, 7, 5, 3],
            backgroundColor: documentStyle.getPropertyValue('--p-blue-500'),
            borderColor: documentStyle.getPropertyValue('--p-blue-500'),
            tension: 0.4,
          },
          {
            label: 'Your Current State',
            data: [4, 5, 3, 4, 6, 3, 1],
            backgroundColor: documentStyle.getPropertyValue('--p-green-500'),
          },
          {
            label: 'Senior',
            data: [8, 8, 7, 9, 10, 7, 5],
            backgroundColor: documentStyle.getPropertyValue('--p-pink-500'),
          }
        ],
      };

      this.basicOptions = {
        plugins: {
          legend: {
            labels: {
              color: textColor,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColorSecondary,
            },
            grid: {
              color: surfaceBorder,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColorSecondary,
            },
            grid: {
              color: surfaceBorder,
            },
          },
        },
      };
      this.cd.markForCheck()
    }
  }

  showDialog() {
    this.visible.set(true);
  }

  redirectToExam(examId: string) {
    this.router.navigate(LINK.exam(examId)).then(() => {});
  }

  products = [
    {
      id: '1000',
      code: 'Fundamentals & Architecture',
      name: 'Mid Level +',
      description: 'Product Description',
      image: 'bamboo-watch.jpg',
      price: 65,
      category: 'Senior',
      quantity: 24,
      inventoryStatus: 'INSTOCK',
      rating: 5
    }]

  rowClass(product: any) {
    return { '!bg-primary !text-primary-contrast': product.category === 'Fitness' };
  }

  rowStyle(product: any) {
    if (product.quantity === 0) {
      return { fontWeight: 'bold', fontStyle: 'italic' };
    }

    return { fontWeight: 'normal', fontStyle: 'normal' };
  }

  stockSeverity(product: any) {
    if (product.quantity === 0) return 'danger';
    else if (product.quantity > 0 && product.quantity < 10) return 'warn';
    else return 'success';
  }
}
