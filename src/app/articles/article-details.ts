import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Comments } from '../comments/comments';
import { ArticleCard } from '../shared/article-card';
import { PublishingStore } from '../shared/publishing-store';
import { SiteHeader } from '../shared/site-header';

@Component({
  selector: 'app-article-details',
  imports: [DatePipe, RouterLink, AvatarModule, ButtonModule, CardModule, TagModule, Comments, ArticleCard, SiteHeader],
  templateUrl: './article-details.html',
})
export class ArticleDetails {
  protected readonly publishing = inject(PublishingStore);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  protected readonly article = computed(() => this.publishing.articles().find((article) => String(article.id) === this.params()?.get('id')));
  protected readonly author = computed(() => this.publishing.authors().find((author) => author.id === this.article()?.authorId));
  protected readonly related = computed(() => {
    const current = this.article();
    if (!current) return [];
    return this.publishing.articles().filter((article) => article.id !== current.id &&
      (article.category === current.category || article.authorId === current.authorId))
      .sort((a, b) => Number(b.category === current.category) - Number(a.category === current.category) ||
        b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 3);
  });
}

