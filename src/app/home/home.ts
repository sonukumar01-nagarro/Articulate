import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { Article } from '../catalog/catalog';
import { ArticleCard } from '../shared/article-card';
import { PublishingStore } from '../shared/publishing-store';
import { SiteHeader } from '../shared/site-header';

type SortMode = 'latest' | 'popular' | 'editors-pick';


@Component({
  imports: [
    CardModule,
    FormsModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    TagModule,
    ArticleCard,
    SiteHeader,
  ],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  protected readonly publishing = inject(PublishingStore);
  protected searchQuery = '';
  protected selectedSort: SortMode = 'latest';
  protected first = 0;
  protected rows = 6;

  protected readonly sortOptions = [
    { label: 'Latest', value: 'latest' },
    { label: 'Most popular', value: 'popular' },
    { label: "Editor's picks", value: 'editors-pick' },
  ];

  protected get sectionTitle(): string {
    if (this.searchQuery.trim()) return 'Search results';
    if (this.selectedSort === 'popular') return 'Most popular';
    if (this.selectedSort === 'editors-pick') return "Editor's picks";
    return 'Latest stories';
  }

  protected get articles(): Article[] { return this.publishing.articles(); }

  protected get featuredArticles(): Article[] {
    return this.articles.filter((article) => article.editorPick).slice(0, 2);
  }

  protected get showFeatured(): boolean {
    return !this.searchQuery.trim() && this.selectedSort === 'latest' && this.featuredArticles.length > 0;
  }

  protected get filteredArticles(): Article[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();
    let results = this.articles.filter((article) => {
      if (this.showFeatured && article.editorPick) return false;
      return !query || `${article.title} ${article.description} ${article.author}`
        .toLocaleLowerCase()
        .includes(query);
    });

    results = [...results];
    if (this.selectedSort === 'popular') {
      results.sort((a, b) => b.views - a.views);
    } else if (this.selectedSort === 'editors-pick') {
      results.sort((a, b) => Number(Boolean(b.editorPick)) - Number(Boolean(a.editorPick)) || this.dateValue(b) - this.dateValue(a));
    } else {
      results.sort((a, b) => this.dateValue(b) - this.dateValue(a));
    }

    return results;
  }

  protected get pageArticles(): Article[] {
    return this.filteredArticles.slice(this.first, this.first + this.rows);
  }

  protected onSearchChange(value: string): void {
    this.searchQuery = value;
    this.first = 0;
  }

  protected onSortChange(value: SortMode): void {
    this.selectedSort = value;
    this.first = 0;
  }

  protected onPageChange(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 6;
  }

  private dateValue(article: Article): number {
    return new Date(article.publishedAt).getTime();
  }
}
