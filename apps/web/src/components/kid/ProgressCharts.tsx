'use client'

import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

/*
  ProgressCharts — the kid's view of how their parent's habits are trending.

  Client Component: Recharts renders to SVG and measures its container width
  at runtime, so it can't be a Server Component. The server page does ALL the
  data work (fetch + weekly aggregation) and hands us plain arrays — this file
  is pure presentation, no Supabase, no business logic.

  Two charts, both built on real task_instances data (not the unpopulated
  nutrition_json):
    1. Weekly completion rate  — area chart, the headline "are they keeping up?"
    2. Completions by category — stacked bars, so Exercise vs Diet vs Medicine
       progression is visible side by side.
*/

export type Week = {
  label:    string
  rate:     number
  exercise: number
  diet:     number
  walk:     number
  medicine: number
  sleep:    number
  custom:   number
}

// Order + colours pulled from the design tokens (globals.css §palette).
const CATEGORIES = [
  { key: 'exercise', label: 'Exercise', color: '#4F7A4E' },
  { key: 'diet',     label: 'Diet',     color: '#D26B26' },
  { key: 'walk',     label: 'Walk',     color: '#C68A1E' },
  { key: 'medicine', label: 'Medicine', color: '#B0432C' },
  { key: 'sleep',    label: 'Sleep',    color: '#6B5CA8' },
  { key: 'custom',   label: 'Other',    color: '#8E7A5C' },
] as const

const AXIS = { fontSize: 11, fill: '#8E7A5C', fontFamily: 'var(--pc-body)' }

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div style={{
      padding: 20, borderRadius: 16,
      background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
    }}>
      <div className="font-serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 2 }}>{title}</div>
      <p style={{ color: 'var(--pc-ink3)', fontSize: 12.5, margin: '0 0 16px' }}>{subtitle}</p>
      {children}
    </div>
  )
}

export default function ProgressCharts({ weeks }: { weeks: Week[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── 1. Weekly completion rate ─────────────────────────────── */}
      <ChartCard title="Completion rate" subtitle="Share of scheduled tasks your parent finished, by week.">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#D26B26" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#D26B26" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,24,18,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} unit="%" width={44} />
            <Tooltip
              formatter={(v) => [`${v}%`, 'Completed']}
              contentStyle={{ borderRadius: 10, border: '0.5px solid rgba(31,24,18,0.12)', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="rate" stroke="#D26B26" strokeWidth={2} fill="url(#rateFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 2. Completions by category ────────────────────────────── */}
      <ChartCard title="By category" subtitle="Completed tasks each week — see which habits are sticking.">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,24,18,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '0.5px solid rgba(31,24,18,0.12)', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 8 }} iconType="circle" iconSize={8} />
            {CATEGORIES.map(c => (
              <Bar key={c.key} dataKey={c.key} name={c.label} stackId="cat" fill={c.color} radius={[2, 2, 0, 0]} maxBarSize={36} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  )
}
