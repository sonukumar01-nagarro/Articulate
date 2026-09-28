import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ArticleCard } from '../shared/article-card';
import { PublishingStore } from '../shared/publishing-store';
import { SiteHeader } from '../shared/site-header';

@Component({
  selector: 'app-author-details',
  imports: [RouterLink, AvatarModule, ButtonModule, ArticleCard, SiteHeader],
  template: `
    <main class="min-h-screen bg-surface-50 text-color dark:bg-surface-950">
      <app-site-header />
      <div class="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <a pButton routerLink="/authors" variant="text"><i class="pi pi-arrow-left" aria-hidden="true"></i> All authors</a>
        @if (author(); as author) {
          <section class="my-8 flex flex-col gap-5 sm:flex-row sm:items-center">
            <p-avatar [image]="author.image" [ariaLabel]="author.name" shape="circle" size="xlarge" />
            <div>
              <h1 class="mb-2 text-3xl font-semibold">{{ author.name }}</h1>
              <p class="max-w-2xl leading-relaxed text-muted-color">{{ author.bio }}</p>
            </div>
          </section>
          <h2 class="mb-5 text-2xl font-semibold">Articles by {{ author.name }}</h2>
          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (article of articles(); track article.id) {
              <app-article-card [article]="article" />
            } @empty {
              <p class="text-muted-color">This author has not published any articles yet.</p>
            }
          </div>
        } @else if (publishing.publicError()) {
          <p role="alert">{{ publishing.publicError() }}</p>
        } @else if (!publishing.publicReady()) {
          <p role="status">Loading author...</p>
        } @else {
          <h1 class="mt-8 text-3xl font-semibold">Author not found</h1>
          <p class="text-muted-color">Explore the directory to find another author.</p>
        }
      </div>
    </main>
  `,
})
export class AuthorDetails {
  protected readonly publishing = inject(PublishingStore);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  protected readonly author = computed(() => this.publishing.authors().find((author) => author.id === this.params()?.get('id')));
  protected readonly articles = computed(() => this.publishing.articles()
    .filter((article) => article.authorId === this.author()?.id)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
}

