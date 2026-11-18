"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export const SERIES_COLORS = ["#c6f432", "#38d0f0", "#f5b942", "#b48cff", "#ff7ab6"];

export interface RadarSeries {
  key: string;
  label: string;
}

/** `data` rows look like { axis: "Coding", [seriesKey]: 82.1, ... } */
export function CategoryRadar({
  data,
  series,
  height = 340,
}: {
  data: Record<string, string | number>[];
  series: RadarSeries[];
  height?: number;
}) {
  return (
    <div role="img" aria-label="Radar chart of category scores" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="60%" margin={{ top: 8, right: 56, bottom: 8, left: 56 }}>
          <PolarGrid stroke="#1c2430" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#8b98a8", fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {series.map((s, i) => (
            <Radar
              key={s.key}
              name={s.label}
              dataKey={s.key}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
              fillOpacity={series.length === 1 ? 0.2 : 0.08}
              strokeWidth={2}
            />
          ))}
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#8b98a8" }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
