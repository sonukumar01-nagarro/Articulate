import { Routes } from '@angular/router';
import { Landing } from './landing/landing';
import { ArticlePage, AuthorPage, AuthorsPage, HomePage, PostEditorPage, PostListPage } from './feature-pages';

export const routes: Routes = [
  { path: '', component: Landing, pathMatch: 'full', title: 'Welcome | Articulate' },
  { path: 'landing', redirectTo: '', pathMatch: 'full' },
  { path: 'login', redirectTo: '', pathMatch: 'full' },
  { path: 'home', component: HomePage, title: 'Home | Articulate' },
  { path: 'authors', component: AuthorsPage, title: 'Authors | Articulate' },
  { path: 'authors/:id', component: AuthorPage, title: 'Author | Articulate' },
  { path: 'articles/:id', component: ArticlePage, title: 'Article | Articulate' },
  { path: 'author/posts', component: PostListPage, title: 'Your stories | Articulate' },
  { path: 'author/posts/new', component: PostEditorPage, title: 'New post | Articulate' },
  { path: 'author/posts/:id/edit', component: PostEditorPage, title: 'Edit draft | Articulate' },
  { path: '**', redirectTo: '' },
];
