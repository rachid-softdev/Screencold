import { Share2, Twitter, Linkedin, Link } from "lucide-react";

interface ShareButtonsProps {
  title: string;
}

export function ShareButtons({ title }: ShareButtonsProps) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, "_blank");
  };

  const shareLinkedin = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-500 mr-1">
        <Share2 className="w-4 h-4" />
      </span>
      <button onClick={shareTwitter} className="p-2 text-neutral-400 hover:text-info-500 transition-colors rounded-full hover:bg-neutral-100" aria-label="Partager sur Twitter">
        <Twitter className="w-4 h-4" />
      </button>
      <button onClick={shareLinkedin} className="p-2 text-neutral-400 hover:text-info-700 transition-colors rounded-full hover:bg-neutral-100" aria-label="Partager sur LinkedIn">
        <Linkedin className="w-4 h-4" />
      </button>
      <button onClick={copyLink} className="p-2 text-neutral-400 hover:text-neutral-700 transition-colors rounded-full hover:bg-neutral-100" aria-label="Copier le lien">
        <Link className="w-4 h-4" />
      </button>
    </div>
  );
}
