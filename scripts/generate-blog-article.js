/**
 * Script de génération d'article de blog par IA
 * Usage: node scripts/generate-blog-article.js
 * Env: ANTHROPIC_API_KEY, ARTICLE_TOPICS (pipe-separated), ARTICLE_CATEGORY, ARTICLE_LENGTH
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Tu es un expert en marketing B2B et content marketing pour le cold outreach et la conversion.
Tu écris des articles de blog SEO-optimisés, informatifs et engageants.
Chaque article doit inclure : titre accrocheur, sous-titre, excerpt, tags, et contenu structuré en blocks JSON.
Le contenu doit être actionnable avec des examples concrets.
Réponds UNIQUEMENT en JSON valide représentant un article complet.
Tous les articles sont écrits en français.`;

const ARTICLE_JSON_PROMPT = (params) => `
Génère un article de blog complet en français sur le sujet : "${params.topic}".
Catégorie : ${params.category}
Longueur cible : ${params.targetLength === 'short' ? 'environ 800 mots' : params.targetLength === 'long' ? 'environ 2500 mots' : 'environ 1200 mots'}

Structure JSON attendue (réponds UNIQUEMENT le JSON, pas de markdown, pas de texte avant ou après) :
{
  "slug": "slug-generé-depuis-le-titre-en-kebab-case-sans-accent",
  "title": "string (max 70 chars, accrocheur, avec mot-clé principal)",
  "subtitle": "string (max 120 chars, complémentaire du titre)",
  "excerpt": "string (150-200 chars, meta description + preview card)",
  "author": "ScreenCold Team",
  "publishedAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}",
  "category": "${params.category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "readingTime": number (estimation minutes),
  "featured": boolean (true pour le premier article seulement),
  "coverImage": "URL Unsplash pertinente (format: https://images.unsplash.com/photo-ID?w=1200)",
  "content": [
    - 2-3 paragraphes d'intro (hook + problématique)
    - 4-8 sections avec heading level 2
    - Chaque section : 2-4 paragraphes substantiels + 1 list ou callout ou image
    - 2-3 callouts (variant: info, tip, ou important)
    - 1 quote pertinent
    - 1 divider entre grandes sections
    - 1 CTA en fin d'article (align: center)
  ],
  "seo": {
    "metaTitle": "string max 60 chars avec mot-clé principal",
    "metaDescription": "string max 160 chars avec CTA sous-entendu",
    "ogImage": "/og-images/blog/[slug].png",
    "canonicalUrl": "https://screencold.io/blog/[slug]"
  },
  "meta": {
    "views": 0,
    "likes": 0,
    "shares": 0,
    "featuredInNewsletter": false
  }
}
`;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

async function generateArticle(params) {
  const topics = params.topics.split('|');
  const selectedTopic = topics[Math.floor(Math.random() * topics.length)].trim();

  console.log(`Generating article: "${selectedTopic}" (category: ${params.category})`);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: ARTICLE_JSON_PROMPT(params).replace('${params.topic}', selectedTopic)
    }]
  });

  const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const article = JSON.parse(rawText);

  // Generate slug if not present
  if (!article.slug || !article.slug.trim()) {
    article.slug = slugify(article.title);
  }

  // Ensure slug is unique
  const articlesDir = join(__dirname, '..', 'content', 'blog', 'articles');
  const indexPath = join(__dirname, '..', 'content', 'blog', 'articles.json');

  let articleSlug = article.slug;
  let counter = 0;
  while (existsSync(join(articlesDir, articleSlug, 'article.json'))) {
    counter++;
    articleSlug = `${article.slug}-${counter}`;
  }
  article.slug = articleSlug;

  // Create article directory
  const articleDir = join(articlesDir, articleSlug);
  mkdirSync(articleDir, { recursive: true });

  // Write article JSON
  writeFileSync(
    join(articleDir, 'article.json'),
    JSON.stringify(article, null, 2),
    'utf-8'
  );

  // Update index
  let index = [];
  if (existsSync(indexPath)) {
    index = JSON.parse(readFileSync(indexPath, 'utf-8'));
  }

  // Remove existing with same slug
  index = index.filter(a => a.slug !== articleSlug);

  // Add to top
  const indexEntry = {
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    category: article.category,
    tags: article.tags,
    readingTime: article.readingTime,
    featured: false, // Only first article can be featured
    coverImage: article.coverImage,
    author: article.author,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt
  };

  index.unshift(indexEntry);
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');

  console.log(`Article generated successfully: ${articleSlug}`);
  console.log(`Title: ${article.title}`);
  console.log(`Slug: ${article.slug}`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const topics = process.env.ARTICLE_TOPICS || 'cold email best practices|stats B2B|cro tips';
  const category = process.env.ARTICLE_CATEGORY || 'cold-outreach';
  const length = process.env.ARTICLE_LENGTH || 'medium';

  await generateArticle({
    topics,
    category,
    targetLength: length
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});