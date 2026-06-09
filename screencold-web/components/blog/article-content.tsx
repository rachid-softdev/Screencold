import Link from "next/link";
import Image from "next/image";

type ContentBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading"; level: 2 | 3 | 4; content: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; content: string; author?: string }
  | { type: "callout"; variant: "info" | "tip" | "warning" | "important"; title: string; content: string }
  | { type: "code"; content: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "cta"; title: string; description: string; url: string; label: string }
  | { type: "divider" };

interface ArticleContentProps {
  content: ContentBlock[];
}

const calloutStyles = {
  info: "border-l-4 border-info-500 bg-info-50",
  tip: "border-l-4 border-success-500 bg-success-50",
  warning: "border-l-4 border-amber-500 bg-amber-50",
  important: "border-l-4 border-error-500 bg-error-50",
};

const calloutTitles = {
  info: "bg-info-100 text-info-800",
  tip: "bg-success-100 text-success-800",
  warning: "bg-amber-100 text-amber-800",
  important: "bg-error-100 text-error-800",
};

export function ArticleContent({ content }: ArticleContentProps) {
  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case "paragraph":
        return (
          <p key={index} className="mb-6 text-neutral-700 leading-relaxed text-base md:text-lg">
            {block.content}
          </p>
        );

      case "heading":
        const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
        const headingClasses = {
          2: "text-3xl font-bold mt-12 mb-6 text-neutral-900",
          3: "text-2xl font-semibold mt-8 mb-4 text-neutral-900",
          4: "text-xl font-semibold mt-6 mb-3 text-neutral-900",
        };
        return (
          <HeadingTag key={index} className={headingClasses[block.level]}>
            {block.content}
          </HeadingTag>
        );

      case "list":
        return (
          <ul key={index} className="mb-6 space-y-2 list-disc list-inside text-neutral-700">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        );

      case "quote":
        return (
          <blockquote
            key={index}
            className="mb-6 border-l-4 border-neutral-300 pl-6 py-2 italic bg-neutral-50 text-neutral-700 rounded-r-lg"
          >
            <p className="text-lg leading-relaxed">&ldquo;{block.content}&rdquo;</p>
            {block.author && (
              <cite className="block mt-2 text-sm text-neutral-500 not-italic">
                — {block.author}
              </cite>
            )}
          </blockquote>
        );

      case "callout":
        return (
          <div
            key={index}
            className={`mb-6 p-5 rounded-lg ${calloutStyles[block.variant]}`}
          >
            <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-3 ${calloutTitles[block.variant]}`}>
              {block.title}
            </div>
            <p className="text-neutral-700 leading-relaxed">{block.content}</p>
          </div>
        );

      case "code":
        return (
          <pre
            key={index}
            className="mb-6 p-4 bg-neutral-900 text-neutral-100 rounded-lg overflow-x-auto text-sm font-mono"
          >
            <code>{block.content}</code>
          </pre>
        );

      case "image":
        return (
          <figure key={index} className="mb-8">
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <Image
                src={block.src}
                alt={block.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 800px"
              />
            </div>
            {block.caption && (
              <figcaption className="mt-2 text-center text-sm text-neutral-500 italic">
                {block.caption}
              </figcaption>
            )}
          </figure>
        );

      case "cta":
        return (
          <div
            key={index}
            className="mb-8 p-8 bg-gradient-to-r from-info-600 to-info-700 rounded-2xl text-center"
          >
            <h3 className="text-xl font-bold text-white mb-2">{block.title}</h3>
            <p className="text-info-100 mb-4">{block.description}</p>
            <Link
              href={block.url}
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-info-700 font-semibold rounded-lg hover:bg-info-50 transition-colors"
            >
              {block.label}
            </Link>
          </div>
        );

      case "divider":
        return (
          <hr
            key={index}
            className="my-12 border-t border-neutral-200"
          />
        );

      default:
        return null;
    }
  };

  return <div className="article-content">{content.map(renderBlock)}</div>;
}