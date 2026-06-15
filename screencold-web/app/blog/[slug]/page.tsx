import { promises as fs } from 'fs';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { BlogArticle } from '@screencold/types';
import { ArticleContent } from '@/components/blog/article-content';
import { TableOfContents } from '@/components/blog/table-of-contents';
import { AuthorCard } from '@/components/blog/author-card';
import { ShareButtons } from '@/components/blog/share-buttons';
import { RelatedArticles } from '@/components/blog/related-articles';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getArticle(slug: string): Promise<BlogArticle | null> {
  try {
    const content = await fs.readFile(
      `${process.cwd()}/content/blog/articles/${slug}/article.json`,
      'utf-8'
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getAllArticles(): Promise<BlogArticle[]> {
  try {
    const data = await fs.readFile(
      `${process.cwd()}/content/blog/articles.json`,
      'utf-8'
    );
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.seo.metaTitle,
    description: article.seo.metaDescription,
    openGraph: {
      title: article.seo.metaTitle,
      description: article.seo.metaDescription,
      images: [article.seo.ogImage || article.coverImage],
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author],
    },
    alternates: { canonical: article.seo.canonicalUrl },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const allArticles = await getAllArticles();
  const relatedArticles = allArticles
    .filter(a => a.slug !== slug && a.category === article.category)
    .slice(0, 3);

  const h2Headings = article.content
    .filter((b: any) => b.type === 'heading' && b.level === 2)
    .map((b: any) => ({ text: b.text || '', id: b.text?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '' }));

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-96 bg-neutral-900">
        <Image
          src={article.coverImage}
          alt=""
          fill
          sizes="100vw"
          className="w-full h-full object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-4xl mx-auto px-4 pb-12 w-full">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-white bg-info-600 px-3 py-1 rounded-full">
                {article.category.replace('-', ' ')}
              </span>
              <span className="text-sm text-neutral-300">{article.readingTime} min</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{article.title}</h1>
            <p className="text-xl text-neutral-300">{article.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-[1fr_220px] gap-12">
          {/* Main content */}
          <article>
            {/* Author + meta */}
            <div className="flex items-center justify-between mb-8 pb-8 border-b">
              <AuthorCard author={article.author} authorRole="" publishedAt={article.publishedAt} />
              <ShareButtons title={article.title} />
            </div>

            {/* Article content */}
            <ArticleContent content={article.content} />

            {/* Takeaway */}
            {article.content?.takeaway && (
              <div className="bg-info-50 border-l-4 border-info-600 p-6 rounded-r-lg my-8">
                <p className="font-semibold text-info-900 mb-1">💡 Takeaway</p>
                <p className="text-info-800">{article.content.takeaway}</p>
              </div>
            )}

            {/* Tags */}
            {article.tags && (
              <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="text-sm bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA final */}
            <div className="bg-gradient-to-r from-info-600 to-info-700 rounded-2xl p-8 mt-12 text-center text-white">
              <h3 className="text-2xl font-bold mb-2">Prêt à améliorer vos cold emails ?</h3>
              <p className="text-info-100 mb-6">Analysez n'importe quel site web en 30 secondes avec ScreenCold.</p>
              <Link
                href="/audits/new"
                className="inline-flex items-center gap-2 bg-white text-info-600 px-6 py-3 rounded-lg font-semibold hover:bg-info-50 transition-colors"
              >
                Créer un audit gratuit →
              </Link>
            </div>

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-16">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">Articles similaires</h3>
                <RelatedArticles articles={relatedArticles} currentSlug={slug} />
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="hidden md:block">
            <div className="sticky top-8 space-y-6">
              {h2Headings.length > 0 && (
                <TableOfContents content={article.content} />
              )}
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="font-semibold text-neutral-900 mb-3">À propos</h4>
                <p className="text-sm text-neutral-600">
                  ScreenCold est un outil SaaS B2B de cold outreach visuel qui analyse automatiquement les sites web de vos prospects.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Back link */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <Link href="/blog" className="text-info-600 hover:text-info-700 flex items-center gap-2">
          ← Retour au blog
        </Link>
      </div>
    </div>
  );
}