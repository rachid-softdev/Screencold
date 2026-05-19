"use client";

import { useEffect, useState } from "react";

interface TableOfContentsProps {
  content: Array<{
    type: string;
    level?: number;
    content?: string;
  }>;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  const headings = content
    .filter((block) => block.type === "heading" && block.level === 2)
    .map((block, index) => ({
      id: `heading-${index}`,
      text: block.content || "",
    }));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -80% 0px",
      }
    );

    const headingElements = document.querySelectorAll("h2[id]");
    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const topOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  if (headings.length === 0) {
    return null;
  }

  if (headings.length < 2) {
    return null;
  }

  return (
    <nav className="sticky top-8 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
        Sommaire
      </h4>
      <ul className="space-y-2">
        {headings.map((heading, index) => {
          const id = `heading-${index}`;
          const isActive = activeId === id;

          return (
            <li key={id}>
              <button
                onClick={() => handleClick(id)}
                className={`block w-full text-left text-sm py-1.5 px-2 rounded transition-colors ${
                  isActive
                    ? "text-blue-600 font-medium bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {heading.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}