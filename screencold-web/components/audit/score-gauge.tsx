"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { clsx } from "clsx";

interface ScoreGaugeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const sizes = {
  sm: { size: 80, strokeWidth: 6, textSize: "text-lg", labelSize: "text-xs" },
  md: { size: 120, strokeWidth: 8, textSize: "text-2xl", labelSize: "text-xs" },
  lg: { size: 180, strokeWidth: 12, textSize: "text-4xl", labelSize: "text-sm" },
};

function getScoreColor(score: number): string {
  if (score < 40) return "#ef4444"; // error-500
  if (score < 70) return "#f97316"; // orange-500
  return "#22c55e"; // success-500
}

function getScoreLabel(score: number): string {
  if (score < 40) return "À améliorer";
  if (score < 70) return "Correct";
  return "Excellent";
}

function ScoreGauge({ score, size = "md", animated = true }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const config = sizes[size];
  const normalizedScore = score ?? 0;

  useEffect(() => {
    if (!animated) {
      setDisplayScore(normalizedScore);
      return;
    }

    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = Math.round(startValue + (normalizedScore - startValue) * easeOut);
      setDisplayScore(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [normalizedScore, animated]);

  const radius = (config.size - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;
  const color = getScoreColor(displayScore);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={config.size}
        height={config.size}
        viewBox={`0 0 ${config.size} ${config.size}`}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={config.strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx("font-bold text-neutral-900", config.textSize)}>
          {displayScore}
        </span>
        {size !== "sm" && (
          <span className={clsx("text-neutral-500", config.labelSize)}>
            {getScoreLabel(displayScore)}
          </span>
        )}
      </div>
    </div>
  );
}

export { ScoreGauge };