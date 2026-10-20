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
  const titleId = React.useId();

  if (!data || data.length === 0) {
    return (
      <div className="gp-overview-empty">
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

  const activeIndex = hoveredIdx !== null && points[hoveredIdx] ? hoveredIdx : points.length - 1;
  const activePt = points[activeIndex];
  const formatRevenue = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <figure className={cn("gp-revenue-chart", className)}>
      <figcaption className="gp-chart-readout" aria-live="polite"><span>{activePt.mes}</span><strong>{formatRevenue(activePt.receita)}</strong></figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId}>
        <title id={titleId}>Receita mensal. Consulte os valores pelos botões de mês abaixo.</title>
        {gridLines.map((line, index) => <g key={index} aria-hidden="true">
          <line x1={padLeft} y1={line.y} x2={width - padRight} y2={line.y} stroke="var(--border)" strokeDasharray="3 5" strokeWidth="1" />
          <text x={padLeft - 10} y={line.y + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="10">{line.val.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })}</text>
        </g>)}
        <path d={areaD} fill="var(--primary)" fillOpacity={0.07} aria-hidden="true" />
        <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
        <line x1={activePt.x} x2={activePt.x} y1={padTop} y2={padTop + chartH} stroke="var(--input)" strokeWidth="1" strokeDasharray="3 5" aria-hidden="true" />
        {points.map((point, index) => <g key={`${point.mes}-${index}`} onPointerEnter={() => setHoveredIdx(index)} aria-hidden="true">
          <circle cx={point.x} cy={point.y} r={18} fill="transparent" />
          <circle cx={point.x} cy={point.y} r={activeIndex === index ? 5 : 3.5} fill={activeIndex === index ? "var(--primary)" : "var(--card)"} stroke="var(--primary)" strokeWidth="2" pointerEvents="none" />
          <text x={point.x} y={height - 8} textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">{point.mes}</text>
        </g>)}
      </svg>
      <div className="gp-chart-months" style={{ "--chart-months": points.length } as React.CSSProperties} role="group" aria-label="Consultar receita por mês">
        {points.map((point, index) => <button type="button" key={`${point.mes}-${index}`} className="gp-chart-month" aria-pressed={activeIndex === index} aria-label={`${point.mes}: ${formatRevenue(point.receita)}`} onFocus={() => setHoveredIdx(index)} onClick={() => setHoveredIdx(index)}>{point.mes}</button>)}
      </div>
    </figure>
  );
}

export default AdminRevenueChart;
