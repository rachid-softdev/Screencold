import Link from "next/link";
import Image from "next/image";
import { Clock, Calendar } from "lucide-react";

interface ArticleCardProps {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  coverImage: string;
  category: string;
  readingTime: number;
  publishedAt: string;
  featured?: boolean;
}

const categoryColors: Record<string, string> = {
  "cold-outreach": "bg-blue-100 text-blue-700",
  "ux-design": "bg-purple-100 text-purple-700",
  cro: "bg-green-100 text-green-700",
  productivity: "bg-orange-100 text-orange-700",
  industry: "bg-gray-100 text-gray-700",
};

const categoryLabels: Record<string, string> = {
  "cold-outreach": "Cold Outreach",
  "ux-design": "UX Design",
  cro: "CRO",
  productivity: "Productivité",
  industry: "Industrie",
};

export function ArticleCard({
  slug,
  title,
  subtitle,
  excerpt,
  coverImage,
  category,
  readingTime,
  publishedAt,
  featured = false,
}: ArticleCardProps) {
  const formattedDate = new Date(publishedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const colorClass = categoryColors[category] || "bg-gray-100 text-gray-700";
  const label = categoryLabels[category] || category;

  if (featured) {
    return (
      <Link
        href={`/blog/${slug}`}
        className="group block relative overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative aspect-video lg:aspect-auto lg:h-full min-h-[280px]">
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col justify-center p-8 lg:p-10">
            <span className={`inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
              {label}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {title}
            </h2>
            <p className="mt-2 text-base text-gray-600 line-clamp-2">
              {subtitle}
            </p>
            <p className="mt-3 text-sm text-gray-500 line-clamp-2">
              {excerpt}
            </p>
            <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${slug}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={coverImage}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />
      </div>
      <div className="p-5">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
          {label}
        </span>
        <h3 className="mt-3 text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
          {excerpt}
        </p>
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{readingTime} min</span>
          </div>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </Link>
  );
}