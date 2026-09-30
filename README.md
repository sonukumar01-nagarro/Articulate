# Articulate

Articulate is a story publishing app where writers create and publish articles and readers discover authors and join discussions.

Live Demo - https://sonukumar01-nagarro.github.io/Articulate/

## Features

- Google and email/password sign-in, with account registration.
- Rich-text editor with headings, compressed inline images, and optional cover thumbnails.
- Private drafts and publicly published stories.
- Article search, sorting, pagination, and author profiles.
- Comments, replies, likes, and light/dark themes.

## Architecture

An Angular app built with standalone components and browser-rendered routes. Feature folders under `src/app/` cover authentication, articles, authors, posts, and comments.

Components → signal-based stores (`PublishingStore`, `CommentStore`) → `FirestoreService` → Cloud Firestore. `Session` tracks Firebase Authentication. Firestore rules restrict drafts to their owners and allow public reading of published stories. A Web Worker compresses editor images before embedding them in story content; each story is limited to 500 KB.

## Libraries

- **Angular 22, TypeScript, RxJS** — application, routing, forms, and reactive utilities.
- **PrimeNG, PrimeIcons, PrimeUI themes, Tailwind CSS** — UI components and styling.
- **Firebase** — authentication and Firestore persistence.
- **ngx-quill / Quill 2** — rich-text editing.
- **Angular SSR / Express** — server infrastructure; routes currently render on the client.
- **Vitest / jsdom** — unit testing.

## Run locally

```sh
npm ci
npm start
```

Open [localhost:4200](http://localhost:4200/).

Firebase configuration is in `src/app/landing/firebase.config.ts`. In that Firebase project, enable Google and Email/Password authentication and Cloud Firestore. Deploy the access rules using the Firebase CLI with an authorized account:

```sh
firebase deploy --only firestore:rules --project articulate-241c7
```

## Test user

- **Email:** `pankaj.jain@example.com`
- **Password:** `password123`

Use email/password sign-in. If this account does not exist in your Firebase project, choose **Create an account** and register it with a display name and the credentials above. The app does not automatically seed users or stories.

## Checks

```sh
npm test -- --watch=false
npm run build
```

Unit tests mock Firebase; live authentication and access rules require a configured Firebase project or emulator to verify.
