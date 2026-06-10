---
target: exams/provas ExamAttemptPlayer
total_score: 28
p0_count: 0
p1_count: 0
timestamp: 2026-05-31T08-05-30Z
slug: web-react-src-components-examattemptplayer-tsx
---
# Critique: ExamAttemptPlayer (exams/provas) — re-run after audit/adapt/colorize/polish

Source-based review (dev server not running, no browser overlay). Deterministic detector re-run: **0 findings** (was 5: 3 gray-on-color false positives + 2 violet-gradient warnings, all now resolved/removed).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong: progress count, bar, position label, status grid; loading now a layout-matching skeleton |
| 2 | Match System / Real World | 3 | PT domain language, letter keys, scissors=eliminate metaphor |
| 3 | User Control and Freedom | 3 | Toggle answer off, prev/next, back; keyboard arrows added |
| 4 | Consistency and Standards | 3 | Feedback colors unified (emerald/red) across all 3 renderers; violet AI cluster folded into cyan. Remaining: window.confirm vs MUI Dialog; 3 question renderers still duplicated |
| 5 | Error Prevention | 2 | Finalizar still terminal with no confirm; native window.confirm for alt delete |
| 6 | Recognition Rather Than Recall | 3 | Visible labeled tabs + question grid; 4 disabled tabs still add noise |
| 7 | Flexibility and Efficiency | 3 | Keyboard answering (A-E / 1-5) + arrow nav added; eliminate still long-press only; shortcuts undiscoverable |
| 8 | Aesthetic and Minimalist | 3 | Skeleton replaces spinner text; 4 dead "em breve" tabs remain |
| 9 | Error Recovery | 2 | Raw error.message in Alert (mixed with getApiMessage elsewhere) |
| 10 | Help and Documentation | 3 | Good inline elimination hint; keyboard shortcuts not surfaced |
| **Total** | | **28/40** | **Good — solid foundation, address weak areas** |

## Anti-Patterns Verdict

LLM assessment: not AI slop. The one genuine tell (violet→indigo AI gradient) is gone. Feedback color now reads as one deliberate semantic system (emerald=correct, red=incorrect, cyan=accent/AI, amber=pending).

Deterministic scan: **clean (0 findings)**. Previous run's 3 gray-on-color hits were ternary-branch false positives; the 2 violet-gradient warnings were real and are now removed.

## What's Working
- One semantic color system across mobile player, desktop player, and QuestionWithFeedbackDisplay (P1 resolved).
- Real keyboard path (A-E / 1-5 to answer, arrows to navigate), guarded against typing fields and edit mode.
- Loading skeleton mirrors the real layout (no CLS) and is reduced-motion-aware.
- Contrast floor fixed for student-facing hints/eliminated text (WCAG 1.4.3).

## Priority Issues (remaining)

[P2] Dead "em breve" tabs. 4 of 6 tabs (Estatísticas, Comentários, Histórico, Notas) disabled in both renderers. Clutter + repeated dead-ends. Fix: hide until shippable or collapse to one affordance. Command: /impeccable distill.

[P2] Keyboard shortcuts undiscoverable. Answering by key works but is unadvertised; eliminate has no keyboard path. Fix: a small hint or "?" affordance; per-alternative focus model for keyboard eliminate. Command: /impeccable harden.

[P2] Three question renderers + mixed confirm patterns. QuestionDisplay, QuestionWithFeedbackDisplay, and the player's inline render duplicate "a question"; window.confirm (alt delete) sits beside MUI Dialog (question delete). Consolidate + standardize. Command: /impeccable polish.

[P2] Finalizar has no confirmation. Terminal action (locks the attempt) fires immediately. Fix: confirm dialog, especially when unanswered questions remain. Command: /impeccable harden.

[P3] Raw error.message in the error Alert. Inconsistent with getApiMessage used elsewhere. Command: /impeccable clarify.

## Persona Red Flags

Alex (power user grinding questions): keyboard answering now works, but shortcuts aren't advertised and eliminate is still long-press only.

Sam (accessibility, low vision — stated PRODUCT goal): contrast fixed and keyboard nav added; remaining gap is keyboard-eliminate and raw error text.

## Minor Observations
- JS QuestionSlide transition still not prefers-reduced-motion gated (CSS keyframes + animate-pulse now are).
- Eliminated state uses icon + strikethrough, not color alone (good).

## Questions to Consider
- Do four "coming soon" tabs build trust, or advertise what's missing?
- Now that keyboard answering exists, how do users discover it?
- Should Finalizar guard against finishing with unanswered questions?
