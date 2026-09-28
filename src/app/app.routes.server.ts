import { RenderMode, ServerRoute } from '@angular/ssr';

// Firestore content and private workspaces load in the browser.
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Client }];
