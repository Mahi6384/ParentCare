'use client'

import { useState } from 'react'
import Link from 'next/link'
import SaathiMark from '@/components/ui/SaathiMark'

/*
  KidNavBar — shared top navigation bar for all kid-side pages.

  Client Component: it owns the mobile drawer open/close state (useState).
  All props are serializable and it makes no server calls, so moving it to
  the client costs nothing. Active tab is still driven by the `activeTab`
  prop passed from each page's Server Component.

  Responsive (see globals.css §5):
   - ≥720px  → horizontal `.pc-nav-tabs` row.
   - <720px  → tabs hide, a `.pc-nav-burger` toggles a `.pc-nav-drawer`.
  The desktop row and the drawer render the SAME items via `renderTab`, so
  there is no duplicated link markup to keep in sync.
*/

type TabId = 'overview' | 'tasks' | 'concerns' | 'report' | 'family'

interface KidNavBarProps {
  userName:  string
  activeTab: TabId
  badge?:    number  // unread count shown on the Concerns tab
  streak?:   number  // top current streak — shown as a compact 🔥 badge on small screens
}

const NAV_ITEMS: { id: TabId; label: string; href: string }[] = [
  { id: 'overview',  label: 'Overview',      href: '/kid/dashboard' },
  { id: 'tasks',     label: 'Tasks',         href: '/kid/tasks'     },
  { id: 'concerns',  label: 'Concerns',      href: '/kid/concerns' },
  { id: 'report',    label: 'Weekly Report', href: '/kid/report'    },
  { id: 'family',    label: 'Family',        href: '/kid/family'    },
]

export default function KidNavBar({ userName, activeTab, badge, streak }: KidNavBarProps) {
  const [open, setOpen] = useState(false)

  // Shared tab renderer — used by both the desktop row and the mobile drawer.
  // `onNavigate` lets the drawer close itself after a tap; the desktop row
  // passes nothing.
  const renderTab = (
    { id, label, href }: (typeof NAV_ITEMS)[number],
    onNavigate?: () => void,
  ) => {
    const active     = id === activeTab
    const badgeCount = id === 'concerns' ? badge : undefined
    return (
      <Link
        key={id}
        href={href}
        onClick={onNavigate}
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
  }

  return (
    <div
      className="pc-nav"
      style={{
        borderBottom: '0.5px solid var(--pc-hair)',
        background: 'var(--pc-bg)',
        position: 'sticky', top: 0, zIndex: 10,
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

      {/* Desktop nav items */}
      <div className="pc-nav-tabs">
        {NAV_ITEMS.map(item => renderTab(item))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Compact streak — replaces the full Streaks card below 880px (see globals.css).
          Only rendered when there's an actual streak to show. */}
      {streak ? (
        <span
          className="pc-nav-streak"
          title={`${streak}-day streak`}
          style={{
            alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 600, lineHeight: 1,
            color: 'var(--pc-brand-deep)',
            background: 'var(--pc-brand-tint)',
            border: '0.5px solid var(--pc-brand-soft)',
            padding: '5px 9px', borderRadius: 999,
          }}
        >
          🔥 {streak}
        </span>
      ) : null}

      {/* Hamburger — visible only below 720px (see globals.css) */}
      <button
        type="button"
        className="pc-nav-burger"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        style={{
          appearance: 'none', cursor: 'pointer',
          width: 34, height: 34, borderRadius: 9,
          background: 'var(--pc-surface2)', border: '0.5px solid var(--pc-hair)',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: 'var(--pc-ink)', lineHeight: 1,
        }}
      >
        {open ? '✕' : '☰'}
      </button>

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

      {/* Mobile drawer — same items, closes on tap */}
      <div className={`pc-nav-drawer${open ? ' open' : ''}`}>
        {NAV_ITEMS.map(item => renderTab(item, () => setOpen(false)))}
      </div>
    </div>
  )
}
