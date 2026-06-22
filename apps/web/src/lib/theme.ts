/*
  Theme constants — the single source of truth for dark/light mode.

  Two consumers read from this file:
    1. ThemeProvider (React) — imports these at runtime in the browser.
    2. The no-flash <script> in the root layout — does NOT import; instead
       we BUILD its source string here (themeInitScript) so the constant
       value gets baked into the string literal at render time. That sidesteps
       the constraint that an inline <script> can't `import` anything.
*/

export type Theme = 'light' | 'dark'

// localStorage key. Change it here and both consumers stay in sync.
export const THEME_STORAGE_KEY = 'pc-theme'

/*
  The anti-FOUC script, as a self-contained string.

  Runs BEFORE first paint (it's placed at the top of <head> as a blocking
  inline script). Logic: a stored choice wins; otherwise fall back to the
  OS-level preference. We only ever ADD the 'dark' class — light is the
  default baked into :root, so the absence of the class already means light.

  Note the IIFE + try/catch: localStorage can throw in private-mode Safari,
  and we never want a theme read to crash the whole page.
*/
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light' ? stored : (systemDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`
