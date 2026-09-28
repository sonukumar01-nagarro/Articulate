export type PostStatus = 'draft' | 'published';

export interface PostInput {
  id?: string;
  title: string;
  summary: string;
  category: string;
  bio: string;
  body: string;
  thumbnail?: string;
}

export interface SavedPost extends PostInput {
  id: string;
  ownerId: string;
  authorId: string;
  authorName: string;
  photo: string | null;
  status: PostStatus;
  updatedAt: string;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  likedBy: string[];
}
