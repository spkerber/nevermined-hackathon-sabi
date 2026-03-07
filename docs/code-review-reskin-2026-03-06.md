# Code review: Sabi webapp reskin & design tokens (2026-03-06)

**Scope:** Design system (Berkeley Mono–inspired), A11y/ARIA, and token rollout across webapp and docs.

**Browser check:** Login, /demo, /docs, /demo/verify/demo-1 exercised; landmarks and interactive elements present.

---

## Summary

The reskin introduces a single source of truth for colors and typography, uses IBM Plex (Sans + Mono), and applies WCAG 2.1 AA–oriented tokens and ARIA where it matters. Structure and behavior are preserved; a few small cleanups and follow-ups are suggested below.

---

## What’s working well

- **Design tokens:** `globals.css` defines a clear palette and Tailwind theme; `docs/design-tokens.md` documents usage and A11y intent.
- **Fonts:** IBM Plex Sans/Mono loaded via `next/font/google` with variable names aligned to CSS (`--font-ibm-plex-sans`, `--font-ibm-plex-mono`).
- **Accessibility:** Semantic structure (main, sections, headings, lists), `aria-label` / `aria-labelledby` / `aria-describedby`, `aria-live` for status, `role="alert"` for errors, and a global `:focus-visible` ring. Forms use proper labels and hints.
- **Suspense:** Login and Home wrap `useSearchParams()` in `<Suspense>` so static export/prerender works.
- **No functional regressions:** Payment modal, demo flow, and verify artifact flow unchanged; only styling and markup improvements.

---

## Findings and recommendations

### 1. **CSS – Redundant focus rule (fixed)**

- **Was:** Both `*:focus-visible` and a long list of `button:focus-visible, a:focus-visible, ...` set the same outline.
- **Change:** Use a single `:focus-visible` rule so all focusable elements get the ring without duplication.

### 2. **Layout – Body `className` formatting**

- **Where:** `app/layout.tsx` line 29.
- **What:** `className="antialiased bg-sabi-bg text-sabi-text min-h-screen"` is split across two lines; the closing `">` is on the next line.
- **Recommendation:** Optional: put `className` and `>` on one line for consistency with the rest of the codebase. Purely stylistic.

### 3. **Payment modal – Dialog semantics**

- **Where:** Home page payment modal (`role="dialog"`, `aria-labelledby`, `aria-describedby`).
- **What:** Focus is not trapped inside the modal and there is no “close on Escape.” For a simple inline modal this may be acceptable.
- **Recommendation:** If the modal is ever used for critical flows (e.g. payment confirmation), add focus trap and Escape-to-close and ensure the first focusable element receives focus when opened.

### 4. **Verify page – Status pipeline contrast**

- **Where:** `app/verify/[id]/page.tsx` and `app/demo/verify/[id]/page.tsx`; pipeline pills use e.g. `bg-sabi-warning text-sabi-bg`.
- **What:** `--sabi-bg` (#0a0a0a) on `--sabi-warning` (#facc15) meets WCAG AA for normal text. No change required; worth keeping in mind if token values change.

### 5. **Docs – Code blocks and copy**

- **Where:** `app/docs/page.tsx`; `<pre><code>` blocks.
- **What:** No “Copy” button on code blocks; docs rely on user selection.
- **Recommendation:** Consider adding a copy button (with `aria-label="Copy code"`) for the curl/API snippets in a later iteration.

### 6. **Login fallback – Theming**

- **Where:** `app/login/page.tsx`; Suspense fallback uses `text-sabi-muted`.
- **What:** Fallback is minimal and uses design tokens; no loading spinner.
- **Recommendation:** Optional: add a small spinner or “Loading…” with `aria-live="polite"` if you want a clearer loading state.

### 7. **Design tokens – High-contrast / reduced motion**

- **Where:** `docs/design-tokens.md` and `globals.css`.
- **What:** No `prefers-reduced-motion` or high-contrast overrides.
- **Recommendation:** Later: respect `prefers-reduced-motion: reduce` (e.g. turn off or simplify `animate-pulse` on status dot) and document or add a high-contrast option if required for compliance.

---

## Checklist (from CLAUDE code review guidelines)

| Area | Status |
|------|--------|
| Data flow / architecture | No change; tokens are presentational only. |
| Infra / ops | Fonts and CSS only; no new env or deployment requirements. |
| Empty / loading / error states | Loading fallbacks and error alerts use tokens and ARIA. |
| Accessibility | Semantic HTML, ARIA, focus ring, labels, and live regions in place. |
| API compatibility | N/A (front-end only). |
| Dependencies | Only `next/font/google` (IBM Plex); no new packages. |
| Testing | No new tests added; manual browser check done. |
| Temporary files / WIP | None introduced. |
| Security | No auth or input logic changed; API key still in password field. |
| Performance | Fonts optimized via next/font; no new heavy assets. |
| Observability | No new logging; existing error handling unchanged. |

---

## Verdict

**Approve with minor follow-ups.** The reskin is consistent, documented, and A11y-aware. The only change applied in this review was simplifying the focus rule in `globals.css`. Remaining items are optional improvements (dialog behavior, code copy, reduced motion, layout formatting).
