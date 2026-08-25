"use client";

import { useState } from "react";

export function PagePreview({
  title,
  src,
}: {
  title: string;
  src: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#1f2937] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs text-gray-400 font-mono truncate">{title}</span>
      </div>
      <div className="relative aspect-video bg-[#0B1120]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          src={src}
          title={title}
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
