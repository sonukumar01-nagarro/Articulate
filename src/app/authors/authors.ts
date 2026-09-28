import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PublishingStore } from '../shared/publishing-store';
import { SiteHeader } from '../shared/site-header';

@Component({
  selector: 'app-authors',
  imports: [FormsModule, RouterLink, AvatarModule, ButtonModule, CardModule, InputTextModule, SiteHeader],
  templateUrl: './authors.html',
})
export class Authors {
  protected readonly publishing = inject(PublishingStore);
  protected query = '';
  protected get authors() {
    const query = this.query.trim().toLocaleLowerCase();
    return this.publishing.authors().filter((author) => author.name.toLocaleLowerCase().includes(query));
  }
  protected articleCount(id: string): number {
    return this.publishing.articles().filter((article) => article.authorId === id).length;
  }
}

