// ─────────────────────────────────────────────────────────────────────────────
//  Today's Summary — SVG chart primitives
// ─────────────────────────────────────────────────────────────────────────────
//  Pure server-side React components that emit SVG. Zero client JS, zero
//  external chart dependency. Color-coded against the user's vertical palette
//  so a CBO can scan the page and immediately know which area is shouting.
// ─────────────────────────────────────────────────────────────────────────────

import { TrendingUp, TrendingDown, Clock, AlertOctagon } from "lucide-react";

// ────────── Hero KPI Tile with sparkline ──────────

export function KpiTile({
  label,
  value,
  spark,
  delta,
  tone = "neutral",
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  spark?: number[];
  delta?: number;
  tone?: "neutral" | "good" | "warn" | "danger";
  hint?: string;
  icon?: React.ReactNode;
}) {
  const toneRing =
    tone === "good"
      ? "ring-success/30 from-success/10"
      : tone === "warn"
      ? "ring-warning/30 from-warning/10"
      : tone === "danger"
      ? "ring-destructive/30 from-destructive/10"
      : "ring-primary/20 from-primary/5";

  const toneText =
    tone === "good"
      ? "text-success"
      : tone === "warn"
      ? "text-warning"
      : tone === "danger"
      ? "text-destructive"
      : "text-primary";

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${toneRing} to-card p-4 ring-1`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        {icon && <div className={toneText}>{icon}</div>}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-3xl font-bold leading-none">{value}</div>
        {typeof delta === "number" && delta !== 0 && (
          <div className={`flex items-center text-[11px] font-semibold ${delta > 0 ? "text-destructive" : "text-success"}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="ml-0.5">{delta > 0 ? "+" : ""}{delta}</span>
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      {spark && spark.length > 1 && (
        <div className="mt-2 -mb-1 -mx-1">
          <Sparkline points={spark} tone={tone} />
        </div>
      )}
    </div>
  );
}

// Inline sparkline as an SVG path. Auto-scales to its range.
export function Sparkline({ points, tone = "neutral" }: { points: number[]; tone?: "neutral" | "good" | "warn" | "danger" }) {
  if (points.length < 2) return null;
  const W = 120;
  const H = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = W / (points.length - 1);
  const stroke =
    tone === "good"
      ? "rgb(34 197 94)"
      : tone === "warn"
      ? "rgb(234 179 8)"
      : tone === "danger"
      ? "rgb(239 68 68)"
      : "rgb(99 102 241)";
  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  // Closing area path for the gradient fill.
  const fillPath = `${path} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`sg-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${tone})`} />
      <path d={path} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ────────── Vertical Pulse Donut ──────────

type DonutSlice = { label: string; value: number; color: string };

export function DonutByVertical({
  slices,
  centerLabel = "Active",
}: {
  slices: DonutSlice[];
  centerLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = 200;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Active tasks by vertical">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,120,120,0.08)" strokeWidth={stroke} />
          {total > 0 &&
            slices.map((s) => {
              const length = (s.value / total) * C;
              const dasharray = `${length} ${C - length}`;
              const dashoffset = -offset;
              offset += length;
              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold leading-none">{total}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            {centerLabel}
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-x-3 gap-y-1.5 sm:flex-1">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
              <span className="font-medium truncate flex-1">{s.label}</span>
              <span className="font-semibold tabular-nums">{s.value}</span>
              <span className="text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────── Owner Workload Bars ──────────

export function OwnerLoadBars({
  rows,
  max,
}: {
  rows: Array<{ owner: string; p1: number; p2: number; total: number }>;
  max: number;
}) {
  if (rows.length === 0) {
    return <div className="py-4 text-center text-sm text-muted-foreground">All leaders responding ✨</div>;
  }
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const width = max > 0 ? Math.max(6, (r.total / max) * 100) : 0;
        const tone = r.p1 >= 5 ? "danger" : r.p1 >= 3 ? "warn" : "good";
        const barColor =
          tone === "danger" ? "bg-destructive" : tone === "warn" ? "bg-warning" : "bg-success";
        return (
          <div key={r.owner} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold truncate">{r.owner}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.p1 > 0 && <span className="text-destructive font-semibold">{r.p1} P1 · </span>}
                {r.p2 > 0 && <span>{r.p2} P2 · </span>}
                {r.total} total
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div className={`h-full ${barColor} transition-all`} style={{ width: `${width}%` }} aria-hidden />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────── Decision Aging Strip ──────────

export function DecisionAging({
  items,
}: {
  items: Array<{ id: string; issue: string; ageHours: number; vertical: string | null }>;
}) {
  if (items.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">No decisions waiting 🎯</div>
    );
  }
  // Cap the visual scale at 96h so a single ancient item doesn't squash the rest.
  const SCALE_MAX = Math.max(96, ...items.map((i) => i.ageHours));
  return (
    <div className="space-y-2">
      {items.map((d) => {
        const pct = Math.min(100, (d.ageHours / SCALE_MAX) * 100);
        const tone = d.ageHours >= 48 ? "destructive" : d.ageHours >= 24 ? "warning" : "primary";
        const barColor = tone === "destructive" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-primary";
        const textColor = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-primary";
        const ageLabel = formatAge(d.ageHours);
        return (
          <div key={d.id} className="rounded-lg border border-border p-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                {d.ageHours >= 48 ? <AlertOctagon className={`h-3 w-3 ${textColor} shrink-0`} /> : <Clock className={`h-3 w-3 ${textColor} shrink-0`} />}
                <span className="font-semibold truncate">{d.issue}</span>
              </div>
              <span className={`shrink-0 font-semibold tabular-nums ${textColor}`}>{ageLabel}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
              <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} aria-hidden />
            </div>
            {d.vertical && <div className="mt-1 text-[10px] text-muted-foreground">{d.vertical}</div>}
          </div>
        );
      })}
    </div>
  );
}

function formatAge(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h`;
}

// ────────── 7-Day Activity Wave ──────────

export function ActivityWave({ buckets }: { buckets: Array<{ label: string; count: number }> }) {
  const W = 600;
  const H = 120;
  const padX = 24;
  const padY = 16;

  if (buckets.length < 2) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Not enough data yet.</div>;
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const stepX = (W - padX * 2) / (buckets.length - 1);

  const xy = buckets.map((b, i) => {
    const x = padX + i * stepX;
    const y = H - padY - (b.count / max) * (H - padY * 2);
    return { x, y, count: b.count, label: b.label };
  });

  const linePath = xy.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L ${xy[xy.length - 1].x} ${H - padY} L ${xy[0].x} ${H - padY} Z`;

  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold leading-none">{total}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">updates · 7 days</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none" aria-label="Task updates over the last 7 days">
        <defs>
          <linearGradient id="wave-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid baseline */}
        <line x1={padX} x2={W - padX} y1={H - padY} y2={H - padY} stroke="rgba(120,120,120,0.2)" strokeWidth="1" />
        <path d={fillPath} fill="url(#wave-fill)" />
        <path d={linePath} stroke="rgb(99 102 241)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="3" fill="rgb(99 102 241)" />
            <circle cx={p.x} cy={p.y} r="6" fill="rgb(99 102 241)" opacity="0.18" />
          </g>
        ))}
      </svg>
      <div className="flex justify-between px-6 text-[10px] font-medium text-muted-foreground">
        {buckets.map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

// ────────── Status Mosaic — small grid by status ──────────

export function StatusMosaic({
  counts,
}: {
  counts: { NOT_STARTED: number; IN_PROGRESS: number; WAITING_FOR_INPUT: number; WAITING_FOR_APPROVAL: number; DELAYED: number; COMPLETED: number; PARKED: number };
}) {
  const tiles: Array<{ key: keyof typeof counts; label: string; tone: string; bg: string }> = [
    { key: "NOT_STARTED",        label: "Not started",  tone: "text-muted-foreground", bg: "bg-muted/40" },
    { key: "IN_PROGRESS",        label: "In progress",  tone: "text-primary",          bg: "bg-primary/10" },
    { key: "WAITING_FOR_INPUT",  label: "Waiting input",tone: "text-warning",          bg: "bg-warning/10" },
    { key: "WAITING_FOR_APPROVAL", label: "Waiting approval", tone: "text-warning",     bg: "bg-warning/10" },
    { key: "DELAYED",            label: "Delayed",      tone: "text-destructive",      bg: "bg-destructive/10" },
    { key: "COMPLETED",          label: "Completed",    tone: "text-success",          bg: "bg-success/10" },
    { key: "PARKED",             label: "Parked",       tone: "text-muted-foreground", bg: "bg-muted/40" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((t) => (
        <div key={t.key} className={`rounded-lg ${t.bg} p-3`}>
          <div className={`text-2xl font-bold ${t.tone}`}>{counts[t.key]}</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
