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
  history: {
    subtitle: 'Your completed tasks show up here.',
    emptyTitle: 'No history yet',
    emptyBody: "As you complete tasks, they'll appear here.",
    today: 'Today',
    yesterday: 'Yesterday',
  },
  // Mono uppercase labels for the alert screen, keyed by task type.
  typeLabels: {
    walk: 'WALK TIME',
    diet: 'MEAL TIME',
    medicine: 'MEDICINE TIME',
    sleep: 'SLEEP TIME',
    exercise: 'EXERCISE TIME',
    custom: 'TASK TIME',
    fallback: 'TIME',
  },
  common: {
    back: 'Back',
  },
  alert: {
    now: 'now',
    titleLead: 'Papa, time for your',
    deadline: (kid: string, time: string) => `${kid} wants you to finish before ${time}.`,
    reassurance: "Just 20 minutes — I'm right here with you.",
    voiceNote: (kid: string) => `${kid}'s voice note`,
    start: '▶  START',
    remindLater: 'Remind me in 30 minutes',
    reminderSet: 'Reminder set ✓',
    doneTitle: 'Done!',
    doneBody: 'This task is already complete.',
    kidFallback: 'Your family',
  },
  submit: {
    doneStatus: (label: string) => `Already done — status: ${label}`,
    dueSub: (time: string) => `Due ${time} · verified by photo`,
    alreadyDoneCard: 'This task was already submitted. ✓',
    uploading: '⏳ Sending…',
    submitBtn: '📤 Submit',
  },
  verify: {
    doneTitle: 'Done!',
    checkingTitle: 'Saathi is checking…',
    doneBody: 'Result is ready, redirecting…',
    checkingBody: 'Your photo is being analyzed. This can take 1–2 minutes.',
  },
  result: {
    passedLabel: 'DONE, PAPA',
    failedLabel: 'TRY AGAIN',
    passedMsg: (title: string) => `${title} went really well! 🎉`,
    failedMsg: 'No worries — try again tomorrow.',
    confidence: 'CONFIDENCE',
    streak: 'STREAK',
    streakValue: (n: number) => `⚡ ${n} days`,
    saathiSent: (kid: string) => `Sent your photo to ${kid}. Great work today!`,
    ok: 'OK',
    kidFallback: 'your child',
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
  history: {
    subtitle: 'आपके पूरे किए हुए काम यहाँ दिखेंगे।',
    emptyTitle: 'अभी कोई इतिहास नहीं',
    emptyBody: 'जैसे-जैसे आप काम पूरे करेंगे, वे यहाँ दिखेंगे।',
    today: 'आज',
    yesterday: 'कल',
  },
  typeLabels: {
    walk: 'टहलने का समय',
    diet: 'खाने का समय',
    medicine: 'दवाई का समय',
    sleep: 'सोने का समय',
    exercise: 'एक्सरसाइज़ का समय',
    custom: 'काम का समय',
    fallback: 'समय',
  },
  common: {
    back: 'वापस',
  },
  alert: {
    now: 'अभी',
    titleLead: 'पापा, अब समय है —',
    deadline: (kid, time) => `${kid} चाहते हैं कि आप ${time} से पहले पूरा करें।`,
    reassurance: 'सिर्फ़ 20 मिनट — मैं आपके साथ हूँ।',
    voiceNote: (kid) => `${kid} का वॉइस नोट`,
    start: '▶  शुरू करें',
    remindLater: '30 मिनट बाद याद दिलाएँ',
    reminderSet: 'याद दिला देंगे ✓',
    doneTitle: 'हो गया!',
    doneBody: 'यह काम पहले ही पूरा हो चुका है।',
    kidFallback: 'आपके घर के',
  },
  submit: {
    doneStatus: (label) => `पहले ही हो गया — स्थिति: ${label}`,
    dueSub: (time) => `${time} तक · फ़ोटो से जाँच`,
    alreadyDoneCard: 'यह काम पहले ही जमा हो चुका है। ✓',
    uploading: '⏳ भेज रहे हैं…',
    submitBtn: '📤 जमा करें',
  },
  verify: {
    doneTitle: 'हो गया!',
    checkingTitle: 'साथी देख रहे हैं…',
    doneBody: 'नतीजा तैयार है, भेज रहे हैं…',
    checkingBody: 'आपकी फ़ोटो जाँची जा रही है। इसमें 1–2 मिनट लग सकते हैं।',
  },
  result: {
    passedLabel: 'हो गया, पापा',
    failedLabel: 'दोबारा कोशिश करें',
    passedMsg: (title) => `${title} बहुत अच्छा हुआ! 🎉`,
    failedMsg: 'कोई बात नहीं — कल फिर कोशिश करें।',
    confidence: 'भरोसा',
    streak: 'स्ट्रीक',
    streakValue: (n) => `⚡ ${n} दिन`,
    saathiSent: (kid) => `${kid} को आपकी फ़ोटो भेज दी है। आज बहुत अच्छा किया!`,
    ok: 'ठीक है',
    kidFallback: 'बच्चे',
  },
}

export type Dict = typeof en

export const dictionaries: Record<'en' | 'hi', Dict> = { en, hi }
