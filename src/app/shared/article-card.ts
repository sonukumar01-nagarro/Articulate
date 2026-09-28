import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Article } from '../catalog/catalog';

@Component({
  selector: 'app-article-card',
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, TagModule],
  host: { class: 'block h-full' },
  template: `
    <p-card class="block h-full overflow-hidden">
      <ng-template #header>
        <img class="aspect-[16/9] w-full object-cover" [src]="article().thumbnail" [alt]="article().title" loading="lazy" />
      </ng-template>
      <ng-template #content>
        <div class="flex flex-wrap gap-2">
          <p-tag [value]="article().category" severity="secondary" />
          @if (article().editorPick) { <p-tag value="Editor's pick" /> }
        </div>
        <h3 class="mb-2 text-xl font-semibold">{{ article().title }}</h3>
        <p class="leading-relaxed text-muted-color">{{ article().description }}</p>
        <div class="flex flex-wrap justify-between gap-2 text-sm text-muted-color">
          <a [routerLink]="['/authors', article().authorId]" class="text-color hover:underline">{{ article().author }}</a>
          <time [attr.datetime]="article().publishedAt">{{ article().publishedAt | date:'mediumDate' }}</time>
        </div>
      </ng-template>
      <ng-template #footer>
        <a pButton [routerLink]="['/articles', article().id]" variant="outlined"
          [attr.aria-label]="'Read ' + article().title">Read article <i class="pi pi-arrow-right" aria-hidden="true"></i></a>
      </ng-template>
    </p-card>
  `,
})
export class ArticleCard {
  readonly article = input.required<Article>();
}

