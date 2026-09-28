import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Session } from '../shared/session';
import { PublishingStore } from '../shared/publishing-store';
import { SiteHeader } from '../shared/site-header';

@Component({
  selector: 'app-post-list',
  imports: [DatePipe, RouterLink, AvatarModule, ButtonModule, CardModule, TagModule, SiteHeader],
  templateUrl: './post-list.html',
})
export class PostList {
  protected readonly session = inject(Session);
  protected readonly store = inject(PublishingStore);
}

