export interface Author {
  id: string;
  name: string;
  bio: string;
  image: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  author: string;
  authorId: string;
  publishedAt: string;
  category: string;
  thumbnail: string;
  views: number;
  editorPick?: boolean;
  content: string[];
  htmlContent?: string;
}

