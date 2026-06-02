# ParentCare — Complete Design Reference
> Source: `ParentCare _standalone_.html` (Claude Design handoff, May 2026)
> Extracted from design screenshots. Refer to this doc before building any page.

---

## 01 · Design System

### Palette — SAFFRON

| Token | Hex | Usage |
|-------|-----|-------|
| `--pc-bg` | `#F8F1E4` | Warm parchment — page canvas |
| `--pc-surface` | `#FFFFFF` | Card / sheet surface |
| `--pc-surface2` | `#F2E8D3` | Inset / secondary surface |
| `--pc-surface3` | `#EADFC6` | Deepest inset |
| `--pc-ink` | `#1F1812` | Warm near-black — primary text |
| `--pc-ink2` | `#5C4B36` | Medium brown — secondary text |
| `--pc-ink3` | `#8E7A5C` | Muted — labels, captions |
| `--pc-ink4` | `#B8A485` | Very muted — placeholders |
| `--pc-brand` | `#D26B26` | Saffron — CTAs, active states |
| `--pc-brand-deep` | `#A8501A` | Deep saffron — pressed, shadows |
| `--pc-brand-soft` | `#F8D9B5` | Light saffron fill |
| `--pc-brand-tint` | `#FCEEDC` | Faintest tint — hover wash |
| `--pc-ok` | `#4F7A4E` | Verified / success — green |
| `--pc-warn` | `#C68A1E` | Flagged / warning — amber |
| `--pc-bad` | `#B0432C` | Failed / error — red |

All tokens are registered in `apps/web/src/app/globals.css`.
Tailwind aliases: `bg-bg`, `bg-surface`, `text-ink`, `text-brand`, etc.

---

### Typography — WARM SERIF

| Stack | Variable | Font | Usage |
|-------|----------|------|-------|
| Display | `--pc-display` / `font-serif` | Newsreader (variable, opsz axis) | H1, hero text, pull quotes, serif headlines |
| Body | `--pc-body` / `font-sans` | Plus Jakarta Sans | UI text, buttons, labels, nav |
| Mono | `--pc-mono` / `font-mono` | JetBrains Mono | Timestamps, conf scores, codes |

**Font scale used in designs:**
- Display hero: 40px / -0.6 tracking / `font-medium`
- Page heading: 32-34px / -0.03em / `font-serif`
- Section title: 24px / -0.02em
- Body: 16-18px / 1.45 line-height
- Caption / label: 11-13px uppercase mono

---

## 02 · Kid Dashboard — Overview (artboard #02)

> Desktop-first. Max-width ~1200px. Three-column layout: main feed + right sidebar.

### Navigation (top bar)
- Logo: `ParentCare` wordmark + `FOR ROHAN` subtext
- Tabs: **Overview** / Tasks / Concerns `●2` / Weekly Report / Family
- Right: Search input (⌘K) + Avatar pill "R"

### Main column (left ~65%)

**Header section**
```
Good morning, Rohan.
Papa is 3 of 5 tasks today · last activity 2 minutes ago.    [Quiet mode] [+ New task]
```

**Week calendar strip**
- 7 day columns: MON 12 – SUN 18
- Each: day abbreviation, date number, thin progress bar (brand color), fraction `5/5`
- Today (FRI 16) highlighted with brand border + `3/5` orange text
- Future days show `—`

**Verification Feed heading**
```
Today — verification feed              ● Live · last reasoned  00:02:14 ago
```

**Task Cards** (one per task_instance)
- Layout: `[Thumbnail image]  [Time · Status badge · streak] [Title] [Agent reasoning text]  conf X.XX`
- Status badges: `● Verified` (green), `● Flagged` (orange), `● Pending` (grey)
- Confidence score: monospace, top right, e.g. `conf 0.91`
- Streak indicator: `⚡ 6`, `⚡ 22`
- Reasoning text: 1-2 lines of agent explanation in `--pc-ink2`
- Pending card shows: "Due now. Push alert sent at 5:30. Will follow up via WhatsApp voice in 20 min if no submission." + `[Send voice nudge now]` `[Skip for today]` buttons

### Right sidebar (~35%)

**Streaks panel** (`this month` label)
```
Streaks                              this month
💊 Medicine — Telma 40    ━━━━━━━━━━━━━━━  22/30
🚶 Morning walk           ━━━━━━    6/7
🏃 Evening exercise       ━━━━      4/7
😴 Sleep by 11 PM         ━━        2/7
```
- Progress bars: `--pc-brand` fill on `--pc-surface2` track

**Health Concern card**
```
HEALTH CONCERN · MEDIUM
Low protein intake for 9 days running.
[paragraph explanation by Saathi]
[Review plan]  [Mute concern]
```
- Header: `--pc-warn` dot + uppercase label
- Title: serif, ~22px
- Buttons: `pc-btn` (Review plan) + `pc-btn-ghost` (Mute concern)

**Saathi Suggests card**
```
● SAATHI SUGGESTS
Add a 10-min breathing exercise before bed.
[paragraph reasoning]
[✓ Approve]  [Edit]  [Dismiss]
```
- Approve: `pc-btn` (brand orange)
- Edit/Dismiss: `pc-btn-ghost`

**Family member card**
```
[R] Papa (Rameshji)
    68 · BP, knee pain · Delhi, IST           ● active
```

---

## 03 · Kid Dashboard — New Task (artboard #03)

> Same desktop layout. Right sidebar shows parent's health profile.

### Breadcrumb
```
Tasks › New
```

### Heading + subtitle
```
Add a new task for Papa
Pick a template. Saathi will adapt it to Papa's health profile — conditions,
restrictions, fitness, equipment — before sending the first reminder.
```

### Template picker (5 cards in grid)
| Template | Icon | Subtitle |
|----------|------|---------|
| Walk | 🚶 | Morning or evening, outdoor |
| Diet | 🍽️ | Meal verification + nutrition |
| Medicine | 💊 | Label-read + adherence |
| Sleep | 😴 | Wind-down + bedtime |
| **Exercise** | 🏃 | **AI-coached step-by-step** (SELECTED — brand border) |

### Configure form (appears below when template selected)
**Title**: Text input, value "Morning routine"

**When**:
- Frequency dropdown: `Daily`
- Time: `7:30 AM`
- Deadline: `before 10 AM`

**Duration** (chip group): `10 min` `15 min` **`20 min`** `30 min`
- Selected chip: solid `--pc-brand-tint` border + `--pc-brand` text

**Reminder channel** (multi-select chips):
- `✓ Push (full-screen)` `✓ WhatsApp voice` `WhatsApp text` `Email kid if missed`

**Proof** (exclusive chips):
- `Photo only` `Photo + label-read` `No proof`

**Voice note from you** (recorder):
```
[▶] Rohan's voice note    ∿∿∿∿∿∿  00:11     [↺ Re-record]
```
- Waveform in `--pc-brand`

**Saathi adaptation panel** (orange tint bg):
```
● SAATHI WILL ADAPT THIS ROUTINE
For Papa — 68, BP, knee pain, no equipment, 20 min — I'll build wall push-ups,
chair-assisted squats, seated knee extensions and a 1-min pranayama. No running,
no jumping. Voice in Hinglish. I'll regenerate the routine fresh each morning so
it doesn't get stale.
```

### Right sidebar: Papa's Health Profile
```
PAPA'S HEALTH PROFILE
Age              68
Conditions       Hypertension  Mild knee pain
Restrictions     No running · No jumping
Fitness          Sedentary
Equipment        —
Food region      North Indian
Language         Hinglish
               [✏ Edit profile]
```

**Recent Agent Notes** (last 3):
- Date label + italic quote from Saathi

---

## 04 · Kid Dashboard — Weekly Report (artboard #04)

### Left panel: Weekly Insight

**Header meta**
```
WEEKLY INSIGHT · SUNDAY 9 PM IST         draft · awaiting your read
```

**Title** (large serif, ~36px):
```
Papa's best week in two months – with one quiet worry.
```

**Byline**: `Written by Saathi · Aug 10 – Aug 16`

**Stats row** (4 stats):
| Label | Value | Sub |
|-------|-------|-----|
| TASKS COMPLETED | 29 / 35 | +5 over last week ↗ mini chart |
| EXERCISE SESSIONS | 6 / 7 | longest streak this month ↗ |
| MEDICINE ADHERENCE | 60% | was 80% last week ↘ |
| AVG SLEEP | 6h 12m | goal: 7h |

**Body prose** (two-column, agent-written):
Long paragraph written by Saathi in first-person. Warm, clinical-but-caring tone.

**Action buttons** (bottom):
`[Approve evening reminder]` `[View full meal plan]` `[Download PDF]` `[Email Papa a copy]`
- First button: `pc-btn` (orange)
- Others: `pc-btn-ghost`

### Right panel: Verification Detail

**Photo** (full width, ~200px tall, warm illustrated style)

**Verification metadata**:
```
● Verified       Mon · 8:14 AM · IST       id #v-1184
Morning Walk – 6th consecutive day
CONFIDENCE  STREAK    CONTEXT USED
0.91        6 days    7 days · 23 photos
```

**Saathi's Reasoning** (tinted box):
```
SAATHI'S REASONING
"Photo shows Papa walking outdoors in Lodhi Garden — full upright posture, morning
light, no walking aid visible. Background matches geotag. This is the 6th consecutive
completion: exercise is firmly habitual. Adding a small encouragement to the next nudge."
```

**Tools called** (mono code box):
```
verify_photo({walk, parent_id: papa}) → ok 0.91
get_parent_history(papa, 7) → 5 consecutive
update_task_result(#t-44) → passed
send_kid_alert(rohan) → delivered
```

**Action buttons**:
`[Override result]` `[Send Papa a 🎉]` `[Full audit log]`

---

## 05 · Parent App — Onboarding Chat (artboard #05)

> Mobile PWA. Max-width 390px. Elderly-first UX. Min 18px body. Big tap targets.

### Chat interface (WhatsApp-style)
**Status bar**: 9:41 AM
**Header**: `← Saathi` · `● online · Hinglish` · `🎤`
**Date divider**: `Today`

**Saathi messages** (left-aligned bubbles, `--pc-surface` white):
```
Namaste Papa 🙏
Main aapka health companion hoon — naam Saathi hai. Pehle thoda aapke baare mein
jaanna chahta hoon.
Aapki umar kitni hai?
```

**User replies** (right-aligned, `--pc-brand` orange fill, white text):
```
Main 68 saal ka hoon
Haan BP hai aur ghutne mein thoda dard rehta hai
```

**Saathi follow-up** (conditional on answer):
```
Theek hai. Doctor ne koi exercise mana ki hai — jaise daudna ya koodna?
```

**Input bar** (bottom):
- Text field: `Apna jawab likhiye...` placeholder
- Right: `🎤` mic button (brand orange circle)

**Questions flow** (collected in order):
1. Age?
2. Health conditions? (BP, sugar, ghutne, dil ki bimari?)
3. Exercise restrictions?
4. What equipment? (chair, mat, bands, none)
5. Food region? (North/South Indian, etc.)

---

## 06 · Parent App — Today's Tasks / ParentHome (artboard #06)

> Max-width 390px mobile PWA. This is the main parent home screen.

### Status bar
```
SHANIWAR · 16 AUG                          🔥 22 din
```
- Day/date: `--pc-mono` 13px uppercase
- Streak pill: flame emoji + bold count + "din"

### Greeting
```
Namaste Papa 🙏
```
- Newsreader serif, 34px, `-0.03em` tracking

### Status subtitle
```
Aaj 2 kaam ho gaye. Ek abhi shuru karna hai — aapka exercise time.
```
- "X kaam ho gaye" in `--pc-ok` green bold
- Remaining in `--pc-ink2`

### Hero card (next pending task)
Background: `--pc-brand` solid saffron
```
● ABHI KARNA HAI
Exercise routine
20 min · 10 simple exercises — Saathi aapko aawaaz se guide karega.
[▶ Shuru karein]
```
- Concentric circle SVG decoration (top-right, `opacity: 0.15`)
- CTA button: cream fill (`--pc-surface`), brand-deep text
- Border radius: 22px

### Task list ("Baaki ke kaam")
Each row:
```
[icon tile]  Task title      time/note
             subtitle
```
- Done tasks: `opacity: 0.65`, icon shows `✓`, title has strikethrough
- Pending: full opacity, icon shows emoji, time in brand-deep
- Icon tile: 46×46px, 12px border radius, `--pc-brand-tint` bg for pending, `--pc-surface2` for done

### Saathi message card
```
[Saathi logo] Saathi ka sandesh
              "Aaj bahut acha chal raha hai — 2 kaam pehle hi ho gaye..."
```
- Italic quote text in `--pc-ink`

### Bottom tab bar
```
☀️ Aaj    📋 Itihaas    ✨ Saathi    👤 Profile
```
- Active: `--pc-brand` color + bold label
- Inactive: `--pc-ink3`
- Bottom padding: `30px` for iPhone home bar

---

## 07 · Parent App — Full-Screen Push Alert (artboard #07)

> Full-bleed saffron screen. This is the PWA push notification landing page.

**Layout**: Full viewport, `--pc-brand` background, white text

**Top bar**:
```
🔔 PARENTCARE                    abhi
```

**Icon** (centered circle): person icon on `--pc-brand-deep` circle

**Content**:
```
EXERCISE TIME          ← mono uppercase label
Papa, time for
your
morning routine.       ← Newsreader serif, ~40px, italic
```

**Description**:
```
Rohan wants you to finish your exercise before 10 AM.
Only 20 minutes — main aapke saath hoon.
```
Bold child's name + deadline.

**Voice note player**:
```
[▶] Rohan's voice note   ∿∿∿∿∿∿  00:11
```
- On saffron bg → player box in `rgba(0,0,0,0.2)`

**CTAs** (stacked, full width):
```
[▶  START NOW          ]  ← cream fill, brand-deep text
[   Remind me in 30 minutes  ]  ← brand-deep semi-transparent fill
```

---

## 08 · Parent App — Exercise Coach (artboard #08)

### Top bar
```
[✕ Ruko]            ▶ 04:21 / 20:00
step 4 / 10          main · 12 min
```
- Progress bar (thin, below top bar): multi-segment with green = done, orange = current, grey = remaining

### Exercise card
```
MAIN SET · #4         ✓ ghutne ke liye safe
Wall push-ups          ← Newsreader, 32px
Deewar ke saamne push-ups — dheere se.
```

**Metrics row** (three chips):
```
SETS   REPS   REST
  3     10    30s
```
- Chip: `--pc-surface` bg, `--pc-surface3` border, monospace value

### Saathi message (speech bubble style)
```
[Saathi avatar]  Saathi bol raha hai
"Papa, deewar se thoda door kadam rakhiye. Saans andar lete hue jhukiye..."  [▶]
```

### CTA (large, full width)
```
[✓  Ho gaya          ]
```
- `--pc-ok` green fill, white text, 60px+ height (elderly tap target)

**Secondary options** (below, smaller):
```
[Reps kam karein]  [Aaram chahiye]  [Skip karein]
```

---

## 09 · Parent App — Photo Verification (artboard #09)

### Back nav
```
← Dopahar ka khaana
```

### Photo display (full width, ~200px)
- Shows submitted food photo
- Overlay: `SAATHI DEKH RAHA HAI! · aapki thali padh raha hoon...`

### Verification progress checklist
```
✓  Photo received                    OK
✓  Recognising dishes                OK
⟳  Comparing with 14-day diet       ...  ← spinning
○  Rohan ko message bhej rahe hain   soon
```
- Completed: green checkmark + "OK"
- In-progress: spinner + `...`
- Pending: grey circle + "soon"

### Bottom (fixed)
```
📷 Doosri photo lijiye agar zaroorat ho
```
- Greyed out, 50% opacity — tap to retake

---

## 10 · Parent App — Result: Ho Gaya! (artboard #10)

### Photo (same, now without overlay)

### Result card
```
✓ HO GAYA, PAPA
Thali bahut acchi lag rahi hai — dal aaj wapas dikhi ☀️
Rohan ko aapki photo bhej di hai. Confidence 0.88. Streak: 15 din.
```
- Header: `--pc-ok` green dot + uppercase label
- Title: Newsreader, ~24px, warm celebratory tone
- Sub: `--pc-ink2`, 15px

### CTA
```
[  Theek hai  ]
```
- `--pc-brand` fill, full width

---

## 11 · Marketing — About Page (artboard #11)

> Wide desktop. Same saffron palette but more whitespace, editorial feel.

### Nav
```
ParentCare  FOR FAMILIES ABROAD  |  About  Pricing  For parents  Help  | Sign in  [Get early access]
```

### Hero section
```
An AI watching over
the people who raised you.
```
Large serif italic in `--pc-brand`

**Tagline**: "Tell us about your parent once. Saathi will text them in the morning, watch their day, and write you a paragraph on Sunday. — no apps for them to learn, no dashboards to check."

### CTA row:
`[Start for free →]` `[See a weekly report]`
- Social proof: "1,200 families · this week" with avatars

### Feature sections:
- "One household, watched closely." (verification feed screenshot)
- "Not a chatbot. Four small agents in a household." (4 agent cards)
- "Adult children living away from parents in their 60s and 70s." (target audience)

---

## 12 · Marketing/Auth — Sign In (artboard #12)

### Layout: 50/50 split

**Left (marketing)**:
```
LAST WEEK · 7 DAYS VERIFIED · 0 MISSED

Welcome back. Mummy
walked at 7:12 this
morning.             ← Newsreader, serif, italic on name

"Six straight days now — the knee modification is clearly helping.
I will keep the routine through next week and re-evaluate Sunday."
```
- Written by: `[Saathi avatar] Saathi written for Rohan · Sunday 9:42 PM IST`

**Right (form)**:
```
SIGN IN
Open the household.
Sign in to see what your parents did today and what Saathi is watching for.

Email
[🔑  rohan.malhotra@gmail.com           ]

Password                              Forgot?
[🔒  ••••••••••••                    [👁] ]

[  Continue to dashboard  →           ]

         — OR —

[🔔  Send magic link to WhatsApp       ]
[👤  Continue with Google              ]

By signing in you accept our Terms and Privacy policy.
Your parents' data never leaves India.
```

**Bottom bar**:
```
parentcare.in                v2.1 · status: all systems operational
```

---

## 13 · Marketing/Auth — Sign Up, Step 1 (artboard #13)

### Layout: 50/50 split

**Left (marketing)**:
```
SETUP · 6 MINUTES · ₹0 FOR THE FIRST 14 DAYS

Hand the worrying over.
Tell us about your parent once...
— no apps for them to learn, no dashboards to check.
```

**Right (form)**:
**Progress steps**:
```
01 About you [active]    02 About your parent    03 Connect WhatsApp
```

```
First, about you.
Just so Saathi knows who to send the weekly note to.

First name        Last name
[🔑 Rohan       ] [Malhotra                       ]

Email                              we send the Sunday note here
[✉ rohan.malhotra@gmail.com                        ]

Where do you live                  time zones
[🌐 London, UK  GMT                                ]

Create password                    min 30 characters
[🔒 ••••••••••                                  👁 ]

[✓] I have my parent's permission to set this up. Saathi will introduce
    itself before sending any reminder, and you can revoke access at any time.

[← Back]          [Continue · meet your parent →  ]

● 14 days free · cancel any time · no card now
```

---

## Component Patterns Quick Reference

### Buttons
| Class | Appearance |
|-------|-----------|
| `.pc-btn` | Solid saffron fill, white text |
| `.pc-btn-ghost` | Surface2 fill, ink2 text, hairline border |
| Large CTA | Full-width, 56-60px height (mobile), brand fill |

### Cards
| Pattern | Style |
|---------|-------|
| `.pc-card` | White bg, 14px radius, `--pc-hair` border |
| Hero card | Brand bg, 22px radius, white text |
| Saathi card | Brand-tint bg, brand dot header |

### Status badges / pills
| State | Dot color | Label |
|-------|-----------|-------|
| Verified | `--pc-ok` | `● Verified` |
| Flagged | `--pc-warn` | `● Flagged` |
| Pending | `--pc-ink3` | `● Pending` |

### Saathi avatar
- Orange circle with illustrated face
- Used in: message cards, chat bubbles, bylines
- Component: `<SaathiMark />` already built in `components/ui/SaathiMark`

### Mobile tab bar
- Height: ~56px + 30px bottom padding
- Surface bg + hairline top border
- 4 tabs: Aaj / Itihaas / Saathi / Profile

---

## Screens Not Yet Built

| # | Screen | Route |
|---|--------|-------|
| 02 | Kid Dashboard - Overview | `/kid/dashboard` |
| 03 | Kid Dashboard - New Task | `/kid/tasks/new` |
| 04 | Kid Dashboard - Weekly Report | `/kid/report` |
| 05 | Parent Onboarding Chat | `/onboarding/chat` |
| 06 | Parent Today's Tasks | `/parent/dashboard` |
| 07 | Parent Full-Screen Alert | `/parent/alert/[id]` |
| 08 | Parent Exercise Coach | `/parent/task/[id]/coach` |
| 09 | Parent Photo Verification | `/parent/task/[id]/verify` |
| 10 | Parent Result | `/parent/task/[id]/result` |
| 11 | Marketing About | `/` (public) |
| 12 | Sign In | `/auth/login` |
| 13 | Sign Up Step 1 | `/auth/signup` |
