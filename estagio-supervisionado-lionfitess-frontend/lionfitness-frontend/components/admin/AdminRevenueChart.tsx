"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface RevenueDataPoint {
  mes: string;
  receita: number;
}

interface AdminRevenueChartProps {
  data: RevenueDataPoint[];
  className?: string;
}

export function AdminRevenueChart({ data, className }: AdminRevenueChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Nenhum dado de receita registrado no período.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.receita), 100);
  // Round up to nice number
  const yMax = Math.ceil(maxVal * 1.15);

  const width = 600;
  const height = 220;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const x = padLeft + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
    const y = padTop + chartH - (d.receita / yMax) * chartH;
    return { x, y, ...d };
  });

  // Build SVG path
  let pathD = "";
  if (points.length === 1) {
    pathD = `M ${padLeft} ${points[0].y} L ${width - padRight} ${points[0].y}`;
  } else {
    pathD = points.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x},${pt.y}`;
      // Smooth cubic bezier
      const prev = arr[idx - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
    }, "");
  }

  const areaD = `${pathD} L ${points[points.length - 1].x},${padTop + chartH} L ${points[0].x},${padTop + chartH} Z`;

  // Horizontal grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: padTop + chartH - ratio * chartH,
    val: Math.round(ratio * yMax),
  }));

  const activePt = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className={cn("relative w-full overflow-hidden select-none", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: 260 }}
      >
        <defs>
          <linearGradient id="adminRevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((gl, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={gl.y}
              x2={width - padRight}
              y2={gl.y}
              stroke="var(--border)"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
            <text
              x={padLeft - 10}
              y={gl.y + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground font-medium"
            >
              {gl.val >= 1000 ? `${(gl.val / 1000).toFixed(1)}k` : gl.val}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#adminRevGradient)" />

        {/* Line stroke */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points and hover zones */}
        {points.map((pt, i) => (
          <g key={i} className="cursor-pointer">
            {/* Invisible large hover target */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={16}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            {/* Real dot */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 6 : 4}
              fill="var(--card)"
              stroke="var(--primary)"
              strokeWidth={hoveredIdx === i ? 3 : 2}
              className="transition-all duration-150"
            />
            {/* X Axis label */}
            <text
              x={pt.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[11px] fill-muted-foreground font-medium"
            >
              {pt.mes}
            </text>
          </g>
        ))}

        {/* Tooltip marker vertical line */}
        {activePt && (
          <line
            x1={activePt.x}
            y1={padTop}
            x2={activePt.x}
            y2={padTop + chartH}
            stroke="var(--primary)"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity={0.7}
          />
        )}
      </svg>

      {/* Floating HTML tooltip */}
      {activePt && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
          style={{
            left: `${(activePt.x / width) * 100}%`,
            top: `${(activePt.y / height) * 100 - 8}%`,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {activePt.mes}
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            R$ {activePt.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminRevenueChart;
