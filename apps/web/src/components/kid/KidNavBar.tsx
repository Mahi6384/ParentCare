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
  userName:  string
  activeTab: TabId
  badge?:    number  // unread count shown on the Concerns tab
}

const NAV_ITEMS: { id: TabId; label: string; href: string }[] = [
  { id: 'overview',  label: 'Overview',      href: '/kid/dashboard' },
  { id: 'tasks',     label: 'Tasks',         href: '/kid/tasks'     },
  { id: 'concerns',  label: 'Concerns',      href: '/kid/concerns' },
  { id: 'report',    label: 'Weekly Report', href: '/kid/report'    },
  { id: 'family',    label: 'Family',        href: '/kid/family'    },
]

export default function KidNavBar({ userName, activeTab, badge }: KidNavBarProps) {
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
        <div className="font-serif font-medium text-[18px] text-ink" style={{ letterSpacing: '-0.01em' }}>
          ParentCare
        </div>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', gap: 4 }}>
        {NAV_ITEMS.map(({ id, label, href }) => {
          const active      = id === activeTab
          const badgeCount  = id === 'concerns' ? badge : undefined
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
              {badgeCount && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 5px',
                    borderRadius: 999, background: 'var(--pc-bad)',
                    color: '#fff', lineHeight: 1.4,
                  }}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* User avatar → profile + sign-out page */}
      <Link
        href="/kid/profile"
        title="Profile & sign out"
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--pc-surface2)', border: '0.5px solid var(--pc-hair)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--pc-display)', fontSize: 14, fontWeight: 600,
          color: 'var(--pc-ink)', textDecoration: 'none',
        }}
      >
        {userName[0]?.toUpperCase() ?? 'U'}
      </Link>
    </div>
  )
}
