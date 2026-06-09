"use client";

import * as React from "react";

interface MetricsChartProps {
  /** Ordered array of numeric data points (latest last). */
  data: number[];
  /** Canvas CSS width in px (default 200). */
  width?: number;
  /** Canvas CSS height in px (default 60). */
  height?: number;
  /** Stroke color for the line (default info-500 #3b82f6). */
  color?: string;
}

/**
 * Canvas-based sparkline chart.  Hand-rolled, no chart library.
 * Renders a simple line from the given data array, scaling values
 * to fit within the canvas dimensions.
 */
export function MetricsChart({
  data,
  width = 200,
  height = 60,
  color = "#3b82f6",
}: MetricsChartProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize backing store for HiDPI screens
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) {
      // Nothing to draw
      return;
    }

    const padding = 2;

    if (data.length === 1) {
      // Single point — draw a small dot
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 2, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      return;
    }

    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal || 1;
    const drawHeight = height - padding * 2;
    const stepX = width / (data.length - 1);

    ctx.beginPath();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    const yNorm = (val: number): number =>
      height - padding - ((val - minVal) / range) * drawHeight;

    ctx.moveTo(0, yNorm(data[0]));

    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(i * stepX, yNorm(data[i]));
    }

    ctx.stroke();
  }, [data, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="inline-block"
    />
  );
}
