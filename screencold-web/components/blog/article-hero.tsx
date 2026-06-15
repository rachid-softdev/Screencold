"use client";

import Image from "next/image";
import { Clock, Calendar } from "lucide-react";
import { ShareButtons } from "./share-buttons";

interface ArticleHeroProps {
  title: string;
  subtitle: string;
  coverImage: string;
  author: string;
  authorRole: string;
  category: string;
  readingTime: number;
  publishedAt: string;
  slug: string;
}

const categoryColors: Record<string, string> = {
  "cold-outreach": "bg-info-500/20 text-info-100 border-info-400/30",
  "ux-design": "bg-purple-500/20 text-purple-100 border-purple-400/30",
  cro: "bg-success-500/20 text-success-100 border-success-400/30",
  productivity: "bg-orange-500/20 text-orange-100 border-orange-400/30",
  industry: "bg-neutral-500/20 text-neutral-100 border-neutral-400/30",
};

const categoryLabels: Record<string, string> = {
  "cold-outreach": "Cold Outreach",
  "ux-design": "UX Design",
  cro: "CRO",
  productivity: "Productivité",
  industry: "Industrie",
};

export function ArticleHero({
  title,
  subtitle,
  coverImage,
  author,
  authorRole,
  category,
  readingTime,
  publishedAt,
}: ArticleHeroProps) {
  const formattedDate = new Date(publishedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const colorClass = categoryColors[category] || "bg-neutral-500/20 text-neutral-100 border-neutral-400/30";
  const label = categoryLabels[category] || category;

  return (
    <div className="relative min-h-[60vh] flex items-end">
      <div className="absolute inset-0">
        <Image
          src={coverImage}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/70 to-neutral-900/20" />
      </div>
      
      <div className="relative w-full max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
            {label}
          </span>
          <div className="flex items-center gap-1.5 text-sm text-neutral-300">
            <Clock className="h-4 w-4" />
            <span>{readingTime} min de lecture</span>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
          {title}
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-200 mb-8 max-w-2xl">
          {subtitle}
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-info-500 text-white font-semibold">
              {author.charAt(0)}
            </div>
            <div>
              <p className="text-white font-medium">{author}</p>
              <p className="text-sm text-neutral-400">{authorRole}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-1.5 text-sm text-neutral-300">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
            <ShareButtons title={title} />
          </div>
        </div>
      </div>
    </div>
  );
}