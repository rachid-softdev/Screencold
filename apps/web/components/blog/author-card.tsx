interface AuthorCardProps {
  author: string;
  authorRole: string;
  publishedAt: string;
}

export function AuthorCard({ author, authorRole, publishedAt }: AuthorCardProps) {
  const formattedDate = new Date(publishedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white text-xl font-semibold shrink-0">
        {author.charAt(0)}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{author}</p>
        <p className="text-sm text-gray-500">{authorRole}</p>
        <p className="text-sm text-gray-400 mt-1">Publié le {formattedDate}</p>
      </div>
    </div>
  );
}