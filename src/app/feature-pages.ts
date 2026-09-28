import { Component } from '@angular/core';
import { ArticleDetails } from './articles/article-details';
import { AuthorDetails } from './authors/author-details';
import { Authors } from './authors/authors';
import { Home } from './home/home';
import { PostEditor } from './posts/post-editor';
import { PostList } from './posts/post-list';

// Keep imports at the top; Angular splits deferred components into separate bundles.
@Component({
  imports: [Home],
  template: `@defer (on immediate) { <app-home /> } @placeholder { <p role="status" class="p-6 text-muted-color">Loading articles...</p> } @error { <p role="alert" class="p-6">Unable to load this page. Please refresh to try again.</p> }`,
})
export class HomePage {}

@Component({
  imports: [Authors],
  template: `@defer (on immediate) { <app-authors /> } @placeholder { <p role="status" class="p-6 text-muted-color">Loading authors...</p> } @error { <p role="alert" class="p-6">Unable to load this page. Please refresh to try again.</p> }`,
})
export class AuthorsPage {}

@Component({
  imports: [AuthorDetails],
  template: `@defer (on immediate) { <app-author-details /> } @placeholder { <p role="status" class="p-6 text-muted-color">Loading author...</p> } @error { <p role="alert" class="p-6">Unable to load this page. Please refresh to try again.</p> }`,
})
export class AuthorPage {}

@Component({
  imports: [ArticleDetails],
  template: `@defer (on immediate) { <app-article-details /> } @placeholder { <p role="status" class="p-6 text-muted-color">Loading article...</p> } @error { <p role="alert" class="p-6">Unable to load this page. Please refresh to try again.</p> }`,
})
export class ArticlePage {}

@Component({
  imports: [PostEditor],
  template: `@defer (on immediate) { <app-post-editor /> } @placeholder { <p role="status" class="p-6 text-muted-color">Loading the editor...</p> } @error { <p role="alert" class="p-6">Unable to load the editor. Please refresh to try again.</p> }`,
})
export class PostEditorPage {}

@Component({
  imports: [PostList],
  template: `@defer (on immediate) { <app-post-list /> } @placeholder { <p role="status" class="p-6 text-muted-color">Loading your stories...</p> } @error { <p role="alert" class="p-6">Unable to load your stories. Please refresh to try again.</p> }`,
})
export class PostListPage {}
