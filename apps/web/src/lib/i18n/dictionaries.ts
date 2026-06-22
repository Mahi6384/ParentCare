/*
  The translation dictionary — one object per language.

  Design:
  - `en` is the source of truth. Its shape defines the Dict type.
  - `hi` is typed as `typeof en`, so TypeScript FORCES it to contain every
    key `en` has, with matching value types. Forget a translation and the
    build fails loudly — no silent missing strings.
  - Dynamic strings (needing a name, a count) are stored as functions, so
    interpolation stays type-checked too.

  Keys are grouped by screen/namespace. New screens add a new namespace.
*/

const en = {
  nav: {
    today: 'Today',
    history: 'History',
    profile: 'Profile',
  },
  profile: {
    title: 'Profile',
    appearance: 'Appearance',
    language: 'Language',
    logout: 'Log out',
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
  },
  lang: {
    english: 'English',
    hindi: 'हिन्दी',
  },
  // Friendly labels for the task_status enum (raw DB values never shown to users).
  status: {
    submitted: 'Submitted',
    passed: 'Verified',
    flagged: 'In review',
    failed: 'Missed',
    skipped: 'Skipped',
  },
  dashboard: {
    // Indexed by Date.getDay() (0=Sun) and Date.getMonth() (0=Jan).
    days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    streakSuffix: 'days',
    greeting: (name: string) => `Hello, ${name} 🙏`,
    tasksDone: (n: number) => `${n} done today`,
    nextHint: (title: string) => ` One left to start — your ${title}.`,
    allDone: ' All done! Wonderful 🌟',
    doNow: 'DO NOW',
    guideSuffix: ' — Saathi will guide you.',
    startCta: '▶ Start',
    otherTasks: 'Other tasks',
    exerciseCoach: 'exercise coach',
    photoVerification: 'photo verification',
    saathiTitle: 'Message from Saathi',
    // Derived from real counts — never a hardcoded claim.
    saathiMessage: (done: number, total: number) =>
      total === 0
        ? 'No tasks for today — enjoy your day! ☀️'
        : done === 0
          ? "Let's begin — your first task is waiting. 🙏"
          : done === total
            ? `All ${total} tasks done today — wonderful work! 🌟`
            : `${done} of ${total} done so far. Keep it up! 💪`,
  },
}

const hi: typeof en = {
  nav: {
    today: 'आज',
    history: 'इतिहास',
    profile: 'प्रोफ़ाइल',
  },
  profile: {
    title: 'प्रोफ़ाइल',
    appearance: 'रूप-रंग',
    language: 'भाषा',
    logout: 'लॉग आउट',
  },
  theme: {
    light: 'लाइट',
    dark: 'डार्क',
  },
  lang: {
    english: 'English',
    hindi: 'हिन्दी',
  },
  status: {
    submitted: 'जमा किया',
    passed: 'सत्यापित',
    flagged: 'जाँच में',
    failed: 'छूट गया',
    skipped: 'छोड़ा गया',
  },
  dashboard: {
    days: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
    months: ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्तू', 'नव', 'दिस'],
    streakSuffix: 'दिन',
    greeting: (name) => `नमस्ते, ${name} 🙏`,
    tasksDone: (n) => `आज ${n} काम हो गए`,
    nextHint: (title) => ` एक अभी करना है — आपका ${title}।`,
    allDone: ' सब हो गया! बहुत बढ़िया 🌟',
    doNow: 'अभी करना है',
    guideSuffix: ' — साथी मदद करेंगे।',
    startCta: '▶ शुरू करें',
    otherTasks: 'बाकी काम',
    exerciseCoach: 'एक्सरसाइज़ कोच',
    photoVerification: 'फ़ोटो वेरिफ़िकेशन',
    saathiTitle: 'साथी का संदेश',
    saathiMessage: (done, total) =>
      total === 0
        ? 'आज कोई काम नहीं — आराम कीजिए! ☀️'
        : done === 0
          ? 'चलिए शुरू करें — आपका पहला काम बाकी है। 🙏'
          : done === total
            ? `आज सभी ${total} काम हो गए — बहुत बढ़िया! 🌟`
            : `अभी तक ${done}/${total} काम हो गए। ऐसे ही करते रहिए! 💪`,
  },
}

export type Dict = typeof en

export const dictionaries: Record<'en' | 'hi', Dict> = { en, hi }
