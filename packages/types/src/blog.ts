// Content block types for blog articles
export type ContentBlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "quote"
  | "callout"
  | "code"
  | "image"
  | "cta"
  | "divider";

// Callout variants for visual emphasis
export type CalloutVariant = "info" | "warning" | "tip" | "important";

// List item structure
export interface ListItem {
  text: string;
  subItems?: ListItem[];
}

// Code block metadata
export interface CodeBlockMeta {
  language: string;
  filename?: string;
  highlightLines?: number[];
}

// Image with caption and alt text
export interface ImageMeta {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

// CTA block configuration
export interface CTAMeta {
  text: string;
  url: string;
  style: "primary" | "secondary" | "outline";
}

// Content block union type
export interface ContentBlock {
  type: ContentBlockType;
  content?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  items?: ListItem[];
  variant?: CalloutVariant;
  code?: CodeBlockMeta;
  image?: ImageMeta;
  cta?: CTAMeta;
}

// Article metadata
export interface ArticleMeta {
  readTime: number; // in minutes
  publishedAt: string;
  updatedAt?: string;
  author: {
    name: string;
    avatar?: string;
  };
  category: string;
  tags: string[];
  featured?: boolean;
}

// SEO configuration
export interface ArticleSEO {
  title: string;
  description: string;
  ogImage?: string;
  keywords?: string[];
  noIndex?: boolean;
}

// Full blog article structure
export interface BlogArticle {
  slug: string;
  title: string;
  subtitle?: string;
  content: ContentBlock[];
  meta: ArticleMeta;
  seo: ArticleSEO;
  relatedSlugs?: string[];
}

// Blog listing item (lighter version)
export interface BlogArticlePreview {
  slug: string;
  title: string;
  subtitle?: string;
  meta: ArticleMeta;
}

// Blog listing response
export interface BlogListing {
  articles: BlogArticlePreview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: string[];
}

// Category with article count
export interface BlogCategory {
  name: string;
  slug: string;
  description: string;
  articleCount: number;
}