---
target: exams/provas ExamAttemptPlayer
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-05-30T23-04-59Z
slug: web-react-src-components-examattemptplayer-tsx
---
# Critique: ExamAttemptPlayer (exams/provas)

Source-based review (dev server not running, no browser overlay). Deterministic checks done manually against source; impeccable detector output was not retrievable in this session.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong: progress count, bar, position label, per-question status grid, snackbars |
| 2 | Match System / Real World | 3 | PT domain language, letter keys, scissors=eliminate metaphor |
| 3 | User Control and Freedom | 3 | Toggle answer off, prev/next, back; no keyboard escape for eliminate |
| 4 | Consistency and Standards | 2 | green vs emerald + rose vs documented red across components; window.confirm vs MUI Dialog; 3 separate question renderers |
| 5 | Error Prevention | 2 | Finalizar is terminal with no confirm; native window.confirm for alt delete |
| 6 | Recognition Rather Than Recall | 3 | Visible labeled tabs + question grid, but 4 disabled tabs add noise |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts to answer (A-E / 1-5); users grind hundreds of questions |
| 8 | Aesthetic and Minimalist | 2 | 4 "em breve" dead tabs; recurring uppercase tracked eyebrow labels |
| 9 | Error Recovery | 2 | Raw error.message in Alert (mixed with getApiMessage elsewhere) |
| 10 | Help and Documentation | 3 | Good inline hint for elimination; explanation-locked-until-finish explained |
| **Total** | | **25/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

LLM assessment: not generic AI slop. The eliminate-alternative affordance (long-press + scissors + haptic + strikethrough), swipe navigation, and per-question status grid are domain-specific and considered. The tells are inconsistency and clutter, not blandness.

Manual deterministic scan:
- No gradient text, no side-stripe borders, no glassmorphism, no hero-metric template.
- Tiny uppercase tracked eyebrow labels recur (`text-xs/[11px] uppercase tracking-wide` on "Texto de referência", "Explicação").
- Color drift: correct = emerald in ExamAttemptPlayer but green in QuestionWithFeedbackDisplay; wrong = rose in both, while DESIGN.md documents red as the semantic. Three-way drift across one flow.
- Low-contrast small text: slate-400 (#94a3b8 ≈ 2.9:1) at 11px for hints / eliminated text; below WCAG AA, against PRODUCT's low-vision goal.

## Priority Issues

[P1] Feedback-color inconsistency. correct is emerald in the player, green in QuestionWithFeedbackDisplay; wrong is rose while DESIGN.md's semantic is red. Same meaning, different hue, in screens a user sees in one attempt-then-feedback flow. Fix: define one semantic set (success/error tokens) and use everywhere. Command: /impeccable colorize then /impeccable polish.

[P1] Low-contrast + tiny text. slate-400 at text-[11px] for hints and eliminated alternatives fails 4.5:1 and is small for long sessions / low vision. Fix: slate-600+ and >=12-13px. Command: /impeccable audit.

[P2] Dead "em breve" tabs. 4 of 6 tabs (Estatísticas, Comentários, Histórico, Notas) are disabled. Clutter + repeated dead-ends. Fix: hide until shippable or collapse to one "Em breve" affordance. Command: /impeccable distill.

[P2] No keyboard efficiency. No shortcuts to select A-E or navigate; eliminate is long-press only (no keyboard path). For a grind-many-questions tool this fails power users and keyboard/AT users. Command: /impeccable adapt or /impeccable harden.

[P2] Three question renderers + mixed confirm patterns. QuestionDisplay, QuestionWithFeedbackDisplay, and the player's inline render duplicate "a question"; window.confirm (alt delete) sits beside MUI Dialog (question delete). Consolidate + standardize. Command: /impeccable polish.

## Persona Red Flags

Aline (working nurse, post-plantão, on phone, tired): tiny slate-400 hints are hard to read at night one-handed; 4 dead tabs waste taps; emerald-here/green-there feedback erodes the "trustworthy" feel.

Alex (power user grinding questions): no keyboard answering or navigation; eliminate requires a 500ms long-press; everything is one-question-at-a-time with mouse/touch only.

Sam (accessibility, low vision — a stated PRODUCT goal): slate-400 text below contrast floor; eliminate has no keyboard equivalent; raw error.message can be unfriendly to screen readers.

## Minor Observations

- JS transitions (QuestionSlide, transition-colors) aren't gated by prefers-reduced-motion (the CSS keyframes are).
- Loading is plain "Carregando prova…" text, not a skeleton (product convention prefers skeletons).
- Eliminated state correctly uses icon + strikethrough, not color alone (good).

## Questions to Consider

- What if correct/incorrect were a single token set used across every question surface?
- Do four "coming soon" tabs build trust, or advertise what's missing?
- What would a keyboard-first version of answering look like for someone doing 200 questions?
