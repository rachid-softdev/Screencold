"use client";

import * as React from "react";
import Image from "next/image";
import { useState } from "react";
import { clsx } from "clsx";

interface IssueHighlight {
  x: number;
  y: number;
  number: number;
}

interface AnnotatedImageProps {
  imageUrl: string;
  highlights: IssueHighlight[];
  alt?: string;
}

function AnnotatedImage({ imageUrl, highlights, alt = "Annotated screenshot" }: AnnotatedImageProps) {
  const [hoveredNumber, setHoveredNumber] = useState<number | null>(null);

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      {/* Image */}
      <div className="relative aspect-[16/10]">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain"
          quality={90}
        />

        {/* Issue markers */}
        {highlights.map((highlight) => (
          <div
            key={highlight.number}
            className={clsx(
              "absolute flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-xs font-bold transition-all",
              "border-2 shadow-md",
              hoveredNumber === highlight.number
                ? "z-20 scale-125 bg-red-500 border-red-600 text-white"
                : "z-10 bg-white border-red-500 text-red-600 hover:scale-110"
            )}
            style={{
              left: `${highlight.x}%`,
              top: `${highlight.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseEnter={() => setHoveredNumber(highlight.number)}
            onMouseLeave={() => setHoveredNumber(null)}
          >
            {highlight.number}
          </div>
        ))}
      </div>

      {/* Legend */}
      {highlights.length > 0 && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">
            Survolez les numéros pour voir les problèmes identifiés
          </p>
        </div>
      )}
    </div>
  );
}

export { AnnotatedImage };