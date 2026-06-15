import { promises as fs } from 'fs';
import Link from 'next/link';
import Image from 'next/image';
import type { BlogArticle } from '@screencold/types';
import { ArticleCard } from '@/components/blog/article-card';

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

async function getArticles(): Promise<BlogArticle[]> {
  const indexPath = `${process.cwd()}/content/blog/articles.json`;
  const data = await fs.readFile(indexPath, 'utf-8');
  return JSON.parse(data);
}

export const metadata = {
  title: 'Blog | ScreenCold',
  description: 'Conseils, statistiques et bonnes pratiques pour maîtriser le cold outreach et la conversion B2B.',
};

export default async function BlogPage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const allArticles = await getArticles();

  const categories = ['cold-outreach', 'ux-design', 'cro', 'productivity', 'industry'];
  const filteredArticles = category && category !== 'all'
    ? allArticles.filter(a => a.category === category)
    : allArticles;

  const featuredArticle = filteredArticles.find(a => a.featured);
  const regularArticles = filteredArticles.filter(a => !a.featured);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Blog</h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Conseils, statistiques et bonnes pratiques pour maîtriser le cold outreach et la conversion B2B.
          </p>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-12">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-12">
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !category || category === 'all'
                ? 'bg-info-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Tous
          </Link>
          {categories.map(cat => (
            <Link
              key={cat}
              href={`/blog?category=${cat}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-info-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {cat === 'cold-outreach' ? 'Cold Outreach' :
               cat === 'ux-design' ? 'UX Design' :
               cat === 'cro' ? 'CRO' :
               cat === 'productivity' ? 'Productivité' :
               'Industry'}
            </Link>
          ))}
        </div>

        {/* Featured article */}
        {featuredArticle && (
          <Link href={`/blog/${featuredArticle.slug}`} className="block mb-12 group">
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="grid md:grid-cols-2">
                <div className="aspect-video md:aspect-auto bg-neutral-200">
                  <Image
                    src={featuredArticle.coverImage}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <span className="text-info-600 text-sm font-semibold uppercase tracking-wide mb-2">
                    Article à la une
                  </span>
                  <h2 className="text-3xl font-bold text-neutral-900 mb-3 group-hover:text-info-600 transition-colors">
                    {featuredArticle.title}
                  </h2>
                  <p className="text-neutral-600 mb-6">{featuredArticle.subtitle}</p>
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <span>{featuredArticle.readingTime} min de lecture</span>
                    <span>•</span>
                    <span>{new Date(featuredArticle.publishedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Articles grid */}
        {regularArticles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularArticles.map((article) => (
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
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-lg">Aucun article dans cette catégorie.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-neutral-500">
          <p>© 2026 ScreenCold. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}