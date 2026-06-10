---
name: Maximize Enfermagem (web-react)
description: Internal study app for Brazilian nurses prepping for public-sector exams
colors:
  primary: "#0891b2"
  primary-deep: "#0e7490"
  primary-tint: "#ecfeff"
  ink: "#0f172a"
  body: "#334155"
  muted: "#64748b"
  border: "#cbd5e1"
  surface: "#ffffff"
  surface-muted: "#f1f5f9"
  success: "#047857"
  success-bg: "#ecfdf5"
  success-solid: "#10b981"
  error: "#dc2626"
  error-bg: "#fef2f2"
  error-solid: "#ef4444"
  warning: "#b45309"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  "2xl": "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm}"
  card-hover:
    backgroundColor: "{colors.surface-muted}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.body}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  nav-link-active:
    textColor: "{colors.primary}"
    backgroundColor: "{colors.primary-tint}"
    rounded: "{rounded.lg}"
---

# Design System: Maximize Enfermagem (web-react)

## 1. Overview

**Creative North Star: "The Training Ground"**

This is a serious athlete's gym for the mind, not a playground. The interface
exists so a working nurse can show up, do the reps (questions, simulados,
review), and watch their numbers climb. Energy comes from visible progress and a
clean, purposeful space, never from decoration shouting for attention. The app is
the coach: it pushes, it tracks, it celebrates real milestones. It is never the
mascot.

The visual language is built on a single confident accent (Momentum Cyan) over a
disciplined slate-and-white field, set in one well-tuned typeface (Manrope) that
carries everything from a dashboard headline to a dense answer key. Surfaces are
calm and tactile: soft, layered shadows give a gentle, app-like depth, with
hairline slate borders for quiet definition. Motion is real but earned, a
question swiping in, a milestone landing, never confetti for a single click.

This system explicitly rejects **childish gamification** (Duolingo-style
mascots, confetti on every tap, cartoon badges), the **cluttered Brazilian
"cram-site"** look (dense walls of text, ad-stuffed pages, no breathing room),
and the **generic SaaS dashboard** (identical KPI card grids, the giant
hero-metric template).

**Key Characteristics:**
- One accent (Momentum Cyan), one typeface (Manrope), a slate neutral spine.
- Soft, layered shadows for calm app-like depth; hairline slate borders define.
- Progress is always legible; that visibility is the motivation engine.
- Built for the marathon: high legibility, low fatigue, long sessions.
- Energetic, never cute. A coach for an adult professional under pressure.

## 2. Colors

A focused palette: one cyan accent for action and progress, a slate ramp for
structure and text, and clear emerald/red semantics reserved for answer feedback.

### Primary
- **Momentum Cyan** (#0891b2): the single accent. Primary buttons, active nav,
  links, progress indicators, focus rings, and the browser theme color. Reads as
  a clinical teal, professional and trustworthy, which suits the nursing domain.
  Its job is action and forward motion, not decoration.
- **Momentum Cyan Deep** (#0e7490): hover/pressed state of the primary, and
  cyan text on light tints where #0891b2 would fall short of contrast.
- **Cyan Tint** (#ecfeff): the wash behind the active nav item and selected
  states. The only place the accent appears as a fill rather than a mark.

### Neutral
- **Ink** (#0f172a, slate-900): primary headings and high-emphasis text.
- **Body** (#334155, slate-700): default reading color for long enunciados and
  explanations.
- **Muted** (#64748b, slate-500): secondary labels, metadata, captions. Floor
  for body-on-white contrast; never go lighter for real text.
- **Border** (#cbd5e1, slate-300): the workhorse. Defines cards, inputs,
  dividers, and panels at rest, since this system leads with borders, not shadow.
- **Surface** (#ffffff): the content field.
- **Surface Muted** (#f1f5f9, slate-100): chips, toolbars, hover fills, and the
  second neutral layer for sidebars/panels against white content.

### Tertiary (semantic feedback)
- **Correct / Success** (#047857 text, #ecfdf5 bg, #10b981 solid): right answers,
  positive deltas in performance, success toasts.
- **Incorrect / Error** (#dc2626 text, #fef2f2 bg, #ef4444 solid): wrong answers,
  negative deltas, error states.
- **Warning** (#b45309): caution states and time-running-out cues.

### Named Rules
**The One Accent Rule.** Momentum Cyan is the only brand color on a screen, used
for action, current state, and progress, on roughly ≤10% of the surface.
Emerald and red are *semantic*, earned only by answer feedback and metric deltas.
If a screen has decorative cyan with no action behind it, remove it.

**The Feedback-Only Color Rule.** Green and red never decorate. They mean
"correct" and "incorrect" (or up/down on a metric). A green button or a red
divider used for flavor is forbidden; it dilutes the one signal that must stay
unambiguous during a quiz.

## 3. Typography

**Display / Body / Label Font:** Manrope (with `ui-sans-serif, system-ui,
sans-serif` fallback), weights 200–800.
**Mono Font:** `source-code-pro, Menlo, Monaco, Consolas, monospace` (code only).

**Character:** One humanist-geometric sans does all the work. Hierarchy comes
from weight (400 body up to 800 display) and a tight product scale, not from a
second typeface. Manrope stays legible at small label sizes and confident at
dashboard headline sizes, which is exactly what a dense study tool needs.

### Hierarchy
- **Display** (800, 1.875rem / text-3xl, 1.15): page-level dashboard titles and
  result screens. Fixed rem, not fluid; product UI views at consistent DPI.
- **Headline** (700, 1.5rem, 1.2): section headers, dialog titles.
- **Title** (600, 1.125rem, 1.35): card titles, question numbers, list headers.
- **Body** (400, 1rem, 1.6): enunciados, explanations, prose. Cap prose at
  65–75ch; answer keys and tables may run denser.
- **Label** (600, 0.875rem, normal): nav labels, chips, buttons, metadata.

### Named Rules
**The One Voice Rule.** Manrope carries every role. No display serif, no second
sans. Reach for weight and size before reaching for another family.

**The No-Shout Rule.** No ALL-CAPS sentences and no clamp-scaled hero type. This
is a tool, not a billboard; uppercase is reserved for short labels (≤4 words).

## 4. Elevation

Depth is conveyed through **soft, layered shadows**: a calm, app-like lift that
makes surfaces feel tactile and slightly raised off the field. Shadows are
*ambient*, not dramatic, low-opacity slate (never black), short blur, tight
spread. A hairline slate-300 border rides under the shadow for crisp definition
on light backgrounds. Cards rest with a gentle ambient shadow and deepen
slightly on hover; only the pressed/active state collapses flat. The current
codebase still leads with borders and a shadow that softens on hover; this spec
sets the target, lean into the ambient layering, keep it subtle.

### Shadow Vocabulary
- **Ambient rest** (`box-shadow: 0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)`):
  the resting lift on cards and panels. Layered and soft.
- **Raised / hover** (`box-shadow: 0 6px 16px -4px rgba(15,23,42,0.12)`): cards
  and interactive surfaces lift a touch on hover.
- **Overlay** (`box-shadow: 0 12px 32px -8px rgba(15,23,42,0.18)`): dialogs,
  drawers, menus, popovers.
- **Pressed** (`box-shadow: none`): active state collapses flat.

### Named Rules
**The Soft Layering Rule.** Depth comes from low-opacity slate shadows (never
pure black, never a hard 2014-era drop shadow). If a shadow looks like a dark box
under the card, the opacity is too high and the blur too small. Keep it ambient.

## 5. Components

### Buttons
- **Shape:** gently rounded (8px / `rounded-lg`), matching the global MUI
  `borderRadius: 8`.
- **Primary:** Momentum Cyan (#0891b2) fill, white text, ~`8px 22px` padding.
- **Hover / Focus:** deepen to #0e7490; visible focus ring in Momentum Cyan.
  Transitions 150–200ms.
- **Secondary / Ghost:** transparent or slate-100 fill with slate border and ink
  text; same radius and padding rhythm.

### Chips
- **Style:** slate-100 fill, slate-700 text, fully rounded (`rounded-full`),
  compact `4px 12px` padding. Used for filters and tags.
- **State:** selected chips take a Momentum Cyan border or cyan-tint fill; never
  a green/red fill (that's reserved for feedback).

### Cards / Containers
- **Corner Style:** 8px (`rounded-lg`); larger panels may use 12–16px.
- **Background:** white surface; slate-100 on hover.
- **Shadow Strategy:** see Elevation, soft ambient rest → slightly raised on
  hover → flat on press, 200ms ease-in-out.
- **Border:** 1px slate-300 hairline under the shadow for crisp definition.
- **Internal Padding:** snug by default (`spacing.sm` 8px), scaling to 16–24px
  for content-heavy panels. Never nest a card inside a card.

### Inputs / Fields
- **Style:** MUI outlined: white fill, slate border, 8px radius.
- **Focus:** border shifts to Momentum Cyan with a matching focus ring.
- **Error / Disabled:** error border + #dc2626 helper text; disabled drops to
  muted slate with reduced contrast.

### Navigation
- **Style:** vertical sidebar (`SideBarV2`) of icon + label rows (Heroicons
  outline + Manrope label, 600). Active item uses Momentum Cyan text on a
  cyan-tint fill; hover is a slate-100 wash.
- **Mobile:** collapses to a fixed bottom nav (`--mobile-bottom-nav-height:
  5rem`) with safe-area insets. Structural collapse, not fluid shrink.

### Signature: Question Player & Feedback
The core surface. A question swipes in (`question-swipe-*`, 280ms
`cubic-bezier(0.2,0.8,0.2,1)`); alternatives are tappable rows. On answer,
correct locks to emerald (#047857 on #ecfdf5), incorrect to red (#dc2626 on
#fef2f2). Milestone/result moments may use the `trophy-bounce` entrance, the one
sanctioned celebratory flourish, kept tasteful and rare. Every animation has a
`prefers-reduced-motion` off-switch already in `styles.css`.

## 6. Do's and Don'ts

### Do:
- **Do** keep Momentum Cyan (#0891b2) as the single accent for action, active
  state, and progress, on ≤10% of any screen.
- **Do** reserve emerald and red strictly for answer feedback and metric deltas.
- **Do** give surfaces soft, layered ambient shadows (low-opacity slate) with a
  1px slate-300 hairline border under them; deepen on hover, flatten on press.
- **Do** set everything in Manrope, using weight (400→800) and the fixed rem
  scale for hierarchy.
- **Do** make progress visible on every relevant screen; that visibility is the
  motivation, in place of cartoon rewards.
- **Do** keep `prefers-reduced-motion` alternatives for every animation (already
  the pattern in `styles.css`).
- **Do** hold body text to ≥4.5:1 contrast; slate-500 is the lightest allowed for
  real text, slate-700 for long reading.

### Don't:
- **Don't** ship childish gamification: no Duolingo-style mascots, confetti on
  every tap, or cartoon badges. The one allowed flourish is `trophy-bounce` on a
  real milestone.
- **Don't** build the cluttered "cram-site" look: dense text walls, ad-stuffed
  panels, zero breathing room.
- **Don't** fall into the generic SaaS dashboard: identical KPI card grids or the
  giant hero-metric template.
- **Don't** use green or red as decoration; they mean correct/incorrect only.
- **Don't** introduce a second typeface, a second accent hue, or clamp-scaled
  hero type.
- **Don't** use hard, dark drop shadows (the 2014 look); keep them low-opacity
  slate and ambient. And never nest a card inside a card.
- **Don't** use `border-left`/`border-right` >1px as a colored accent stripe.
