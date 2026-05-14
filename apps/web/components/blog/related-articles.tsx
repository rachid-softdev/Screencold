import { ArticleCard } from "./article-card";

interface Article {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  coverImage: string;
  category: string;
  readingTime: number;
  publishedAt: string;
}

interface RelatedArticlesProps {
  articles: Article[];
  currentSlug: string;
}

export function RelatedArticles({ articles, currentSlug }: RelatedArticlesProps) {
  const filteredArticles = articles
    .filter((article) => article.slug !== currentSlug)
    .slice(0, 3);

  if (filteredArticles.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 pt-12 border-t border-gray-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-8">
        Articles similaires
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <ArticleCard
            key={article.slug}
            slug={article.slug}
            title={article.title}
            subtitle={article.subtitle}
            excerpt={article.excerpt}
            coverImage={article.coverImage}
            category={article.category}
            readingTime={article.readingTime}
            publishedAt={article.publishedAt}
            featured={false}
          />
        ))}
      </div>
    </div>
  );
}