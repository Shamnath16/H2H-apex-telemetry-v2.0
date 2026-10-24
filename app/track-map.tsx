"use client";

import { useEffect, useMemo, useState } from "react";

type Point = { x: number; y: number };
type Corner = { number: number; trackPosition: Point; angle?: number };
type Geometry = { x: number[]; y: number[]; corners: Corner[]; circuitName?: string; estimated: boolean };
type Lap = { driver_number: number; date_start: string; lap_duration: number | null };
type Props = { circuitKey?: number; sessionKey?: number; trackName?: string; lap?: Lap };
const cache = new Map<string, Geometry>();

function numericPoints(data: unknown): Point[] {
  if (!Array.isArray(data)) return [];
  return data.filter((point): point is Point => Boolean(point) && typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y));
}

function estimateCorners(points: Point[], circuitKey: number): Corner[] {
  const reach = Math.max(3, Math.round(points.length / 75));
  const scores: { i: number; score: number }[] = [];
  for (let i = reach; i < points.length - reach; i++) {
    const p = points[i - reach], q = points[i], r = points[i + reach];
    const ax = q.x - p.x, ay = q.y - p.y, bx = r.x - q.x, by = r.y - q.y;
    const score = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
    if (Number.isFinite(score) && score > 0.11) scores.push({ i, score });
  }
  const peaks = scores.filter((item, index) => item.score >= (scores[index - 1]?.score ?? 0) && item.score >= (scores[index + 1]?.score ?? 0));
  const wanted = circuitKey === 12 ? 15 : 16;
  const spacing = Math.max(5, Math.round(points.length / 28));
  const chosen: { i: number; score: number }[] = [];
  for (const peak of peaks.sort((a, b) => b.score - a.score)) {
    if (chosen.every(item => Math.abs(item.i - peak.i) > spacing)) chosen.push(peak);
    if (chosen.length >= wanted) break;
  }
  return chosen.sort((a, b) => a.i - b.i).map((item, index) => ({ number: index + 1, trackPosition: points[item.i] }));
}

function fit(geometry: Geometry) {
  const coords = geometry.x.map((x, i) => ({ x, y: geometry.y[i] })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (coords.length < 10) return null;
  const minX = Math.min(...coords.map(p => p.x)), maxX = Math.max(...coords.map(p => p.x));
  const minY = Math.min(...coords.map(p => p.y)), maxY = Math.max(...coords.map(p => p.y));
  const width = maxX - minX, height = maxY - minY;
  if (width <= 0 || height <= 0) return null;
  const scale = Math.min(292 / width, 167 / height);
  const ox = (360 - width * scale) / 2, oy = (230 - height * scale) / 2;
  const place = (p: Point) => ({ x: ox + (p.x - minX) * scale, y: oy + (p.y - minY) * scale });
  const stride = Math.max(1, Math.ceil(coords.length / 480));
  const line = coords.filter((_, i) => i % stride === 0 || i === coords.length - 1).map((p, i) => { const q = place(p); return `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join(" ");
  const corners = geometry.corners.filter(c => Number.isFinite(c.number) && c.trackPosition && Number.isFinite(c.trackPosition.x) && Number.isFinite(c.trackPosition.y)).map(c => {
    const p = place(c.trackPosition); const cx = 180, cy = 115;
    const angle = Math.atan2(p.y - cy, p.x - cx);
    return { number: c.number, x: p.x, y: p.y, labelX: Math.max(12, Math.min(348, p.x + 16 * Math.cos(angle))), labelY: Math.max(12, Math.min(218, p.y + 16 * Math.sin(angle))) };
  });
  return { line, corners };
}

export function TrackMap({ circuitKey, sessionKey, trackName, lap }: Props) {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!circuitKey || !sessionKey) { setGeometry(null); return; }
    const controller = new AbortController();
    let live = true;
    const key = `circuit-${circuitKey}`;
    if (cache.has(key)) { setGeometry(cache.get(key)!); return; }
    setGeometry(null); setPending(true);
    (async () => {
      for (const year of [2026, 2025]) {
        try {
          const response = await fetch(`https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${year}`, { signal: controller.signal });
          if (!response.ok) continue;
          const data = await response.json() as Partial<Geometry>;
          if (Array.isArray(data.x) && Array.isArray(data.y) && data.x.length >= 10 && Array.isArray(data.corners) && data.corners.length) {
            const result: Geometry = { x: data.x, y: data.y, corners: data.corners, circuitName: data.circuitName, estimated: false };
            cache.set(key, result); if (live) setGeometry(result); return;
          }
        } catch { if (controller.signal.aborted) return; }
      }
      if (!lap?.date_start || !lap.lap_duration) return;
      try {
        const start = new Date(lap.date_start).toISOString();
        const end = new Date(Date.parse(lap.date_start) + lap.lap_duration * 1000).toISOString();
        const response = await fetch(`https://api.openf1.org/v1/location?session_key=${sessionKey}&driver_number=${lap.driver_number}&date>=${encodeURIComponent(start)}&date<=${encodeURIComponent(end)}`, { signal: controller.signal });
        if (!response.ok) return;
        const points = numericPoints(await response.json());
        if (points.length < 30) return;
        const result: Geometry = { x: points.map(p => p.x), y: points.map(p => p.y), corners: estimateCorners(points, circuitKey), estimated: true };
        cache.set(key, result); if (live) setGeometry(result);
      } catch { /* Show the unavailable state. */ }
    })().finally(() => { if (live) setPending(false); });
    return () => { live = false; controller.abort(); };
  }, [circuitKey, sessionKey, lap?.driver_number, lap?.date_start, lap?.lap_duration]);
  const drawing = useMemo(() => geometry ? fit(geometry) : null, [geometry]);
  const title = geometry?.circuitName || trackName || "Select a circuit";
  return <section className="box track-panel" aria-label="Track map">
    <div className="track-panel-heading"><span>04 / CIRCUIT MAP</span><strong>{title}</strong></div>
    {drawing ? <svg viewBox="0 0 360 230" role="img" aria-label={`${title} track map with ${drawing.corners.length} numbered ${geometry?.estimated ? "estimated turn markers" : "turns"}`}>
      <path d={drawing.line} fill="none" stroke="#ff3029" strokeOpacity=".12" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d={drawing.line} fill="none" stroke="#ff3029" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {drawing.corners.map(c => <g key={c.number}><circle cx={c.x} cy={c.y} r="3" fill="#ff3029" /><circle cx={c.labelX} cy={c.labelY} r="10" fill="#080808" stroke={geometry?.estimated ? "#ffffff" : "#ff3029"} strokeWidth="1" /><text x={c.labelX} y={c.labelY + 3.5} textAnchor="middle" fill="#f2f3f0" fontSize="10" fontWeight="700">{c.number}</text></g>)}
    </svg> : <div className="track-empty">{pending ? "Loading track map…" : "Track geometry is unavailable for this session."}</div>}
    <div className="track-source">{geometry ? geometry.estimated ? "Estimated turn markers from OpenF1 GPS" : "Circuit geometry and turns: MultiViewer" : "Map follows the selected session"}</div>
  </section>;
}
