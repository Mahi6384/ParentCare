import Link from 'next/link'
import SaathiMark from '@/components/ui/SaathiMark'

/*
  KidNavBar — shared top navigation bar for all kid-side pages.

  Extracted from /kid/dashboard/page.tsx so it can be reused across
  tasks, concerns, report, and family pages without duplication.

  Server Component — no interactivity needed; active state is driven
  by the `activeTab` prop passed from each page's Server Component.
*/

type TabId = 'overview' | 'tasks' | 'concerns' | 'report' | 'family'

interface KidNavBarProps {
  userName: string   // displayed as "for Rohan" in sub-label
  activeTab: TabId
}

const NAV_ITEMS: { id: TabId; label: string; href: string; badge?: number }[] = [
  { id: 'overview',  label: 'Overview',      href: '/kid/dashboard' },
  { id: 'tasks',     label: 'Tasks',         href: '/kid/tasks'     },
  { id: 'concerns',  label: 'Concerns',      href: '/kid/concerns', badge: 2 },
  { id: 'report',    label: 'Weekly Report', href: '/kid/report'    },
  { id: 'family',    label: 'Family',        href: '/kid/family'    },
]

export default function KidNavBar({ userName, activeTab }: KidNavBarProps) {
  return (
    <div
      style={{
        height: 60, display: 'flex', alignItems: 'center', gap: 28,
        padding: '0 28px', borderBottom: '0.5px solid var(--pc-hair)',
        background: 'var(--pc-bg)', position: 'sticky', top: 0, zIndex: 10,
      }}
    >
      {/* Logo + wordmark */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          paddingRight: 24, borderRight: '0.5px solid var(--pc-hair)', height: '100%',
        }}
      >
        <SaathiMark size={26} />
        <div style={{ lineHeight: 1.1 }}>
          <div className="font-serif font-medium text-[18px] text-ink" style={{ letterSpacing: '-0.01em' }}>
            ParentCare
          </div>
          <div className="font-mono text-[10.5px] text-ink-3 tracking-[0.04em] uppercase">
            for {userName}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', gap: 4 }}>
        {NAV_ITEMS.map(({ id, label, href, badge }) => {
          const active = id === activeTab
          return (
            <Link
              key={id}
              href={href}
              style={{
                textDecoration: 'none',
                background: active ? 'var(--pc-surface)' : 'transparent',
                color:      active ? 'var(--pc-ink)'    : 'var(--pc-ink2)',
                fontFamily: 'var(--pc-body)',
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                padding: '8px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: active ? '0 0 0 0.5px var(--pc-hair)' : 'none',
              }}
            >
              {label}
              {badge && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 5px',
                    borderRadius: 999, background: 'var(--pc-bad)',
                    color: '#fff', lineHeight: 1.4,
                  }}
                >
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 10px',
          background: 'var(--pc-surface)', border: '0.5px solid var(--pc-hair)',
          borderRadius: 999, fontSize: 12.5, color: 'var(--pc-ink3)', minWidth: 220,
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--pc-ink3)" strokeWidth={1.5} strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
        </svg>
        <span>Search tasks, days, photos…</span>
        <span
          style={{
            marginLeft: 'auto', fontFamily: 'var(--pc-mono)', fontSize: 10.5,
            padding: '1px 5px', border: '0.5px solid var(--pc-hair)',
            borderRadius: 4, color: 'var(--pc-ink3)',
          }}
        >
          ⌘K
        </span>
      </div>

      {/* User avatar */}
      <div
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--pc-surface2)', border: '0.5px solid var(--pc-hair)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--pc-display)', fontSize: 14, fontWeight: 600, color: 'var(--pc-ink)',
        }}
      >
        {userName[0]?.toUpperCase() ?? 'U'}
      </div>
    </div>
  )
}
