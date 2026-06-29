import type { Metadata, Viewport } from 'next'
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { themeInitScript } from '@/lib/theme'

/*
  Why next/font instead of a CSS @import?
  ─────────────────────────────────────────────
  next/font/google self-hosts the font files on your Vercel deployment.
  No external request to Google's CDN at runtime → faster LCP, zero
  layout shift, better privacy. It generates CSS variables that we slot
  into globals.css via :root { --pc-display: var(--font-newsreader) }.

  Each font is loaded with only the weights we actually use in the design.
  Anything extra is dead weight on initial page load.
*/

// Display / editorial — headings, hero text, pull quotes.
// Newsreader is a variable font, so we set weight:'variable' to
// get the full range (100–900) in one file, which also unlocks
// the opsz (optical size) axis — Next.js requires weight to be
// absent or 'variable' before it allows axes:[]. The opsz axis
// adjusts stroke contrast at small vs large display sizes, giving
// us crisper text at 11px labels AND more expressive type at 44px
// hero headlines from the same font file.
const newsreader = Newsreader({
  subsets:  ['latin'],
  variable: '--font-newsreader',
  style:    ['normal', 'italic'],
  weight:   'variable',
  display:  'swap',
  axes:     ['opsz'],
})

// Body — UI text, buttons, labels, nav.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-plus-jakarta-sans',
  weight:   ['400', '500', '600', '700'],
  display:  'swap',
})

// Mono — timestamps, confidence scores, invite codes, code snippets.
const jetbrainsMono = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-jetbrains-mono',
  weight:   ['400', '500'],
  display:  'swap',
})

export const metadata: Metadata = {
  title:       'ParentCare',
  description: 'Kids assign tasks. Parents complete them. AI verifies the proof.',
  manifest:    '/manifest.json',
  // src/app/icon.svg is auto-served as the favicon by Next's file
  // convention; we only need to declare the apple-touch icon, which
  // iOS pulls for the home-screen bookmark.
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'default',
    title:           'ParentCare',
  },
}

/*
  themeColor lives in the viewport export (not metadata) since Next 14.
  It paints the OS chrome — Android status bar, installed-PWA title bar —
  saffron, so the app feels native rather than bolted onto a white bar.
  Two stops let it track light/dark: deep saffron reads better on a dark
  status bar, the standard brand saffron on light.
*/
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#D26B26' },
    { media: '(prefers-color-scheme: dark)',  color: '#A8501A' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`
        ${newsreader.variable}
        ${plusJakartaSans.variable}
        ${jetbrainsMono.variable}
        h-full antialiased
      `}
    >
      {/*
        The three CSS variables injected by next/font:
          --font-newsreader        ← used as var(--pc-display) in :root
          --font-plus-jakarta-sans ← used as var(--pc-body)
          --font-jetbrains-mono    ← used as var(--pc-mono)

        globals.css :root reads them via:
          --pc-display: var(--font-newsreader), Georgia, serif;
          --pc-body:    var(--font-plus-jakarta-sans), system-ui, sans-serif;
          --pc-mono:    var(--font-jetbrains-mono), monospace;
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/*
          No-flash theme script — executes during HTML parsing, before any
          visible element paints, so dark-mode users never see a white flash.
          dangerouslySetInnerHTML is the standard, safe way to inline it here:
          the content is our own trusted constant, not user input.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
