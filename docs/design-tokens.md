# Sabi design tokens (A11y)

Design system inspired by the [Berkeley Mono](https://usgraphics.com/products/berkeley-mono) product page: technical, control-panel aesthetic, monospace-forward. Uses **free** fonts (IBM Plex) and a dark theme with WCAG 2.1 AA–compliant contrast.

## Fonts

| Role   | Font           | Use                    |
|--------|----------------|------------------------|
| Sans   | IBM Plex Sans  | UI, labels, body text  |
| Mono   | IBM Plex Mono  | Code, IDs, data, docs  |

## Color tokens (dark theme)

All foreground colors meet **4.5:1** contrast on their background (WCAG AA normal text). Large text meets 3:1 where used.

| Token           | Hex       | Use |
|-----------------|-----------|-----|
| `--sabi-bg`     | `#0a0a0a` | Page background |
| `--sabi-surface`| `#141414` | Cards, inputs, panels |
| `--sabi-border` | `#262626` | Borders, dividers |
| `--sabi-text`   | `#fafafa` | Primary text |
| `--sabi-muted`  | `#a1a1a1` | Secondary text |
| `--sabi-accent` | `#6b8cff` | Links, primary actions |
| `--sabi-accent-hover` | `#8ba3ff` | Hover state |
| `--sabi-success`| `#4ade80` | Verified, success |
| `--sabi-warning`| `#facc15` | Waiting, caution |
| `--sabi-error`  | `#f87171` | Errors, destructive |
| `--sabi-focus`  | `#6b8cff` | Focus ring (2px) |

## Status colors (badges, pipelines)

- **connecting / waiting**: `--sabi-warning`
- **accepted**: `--sabi-accent`
- **in_progress**: Lighter blue variant
- **verified**: `--sabi-success`
- **cancelled**: Muted gray

## ARIA and accessibility

- Interactive elements are keyboard-focusable; focus ring uses `--sabi-focus`.
- Live regions for status updates use `aria-live="polite"` where content changes.
- Form inputs have associated `<label>` with `htmlFor`; buttons that are icon-only have `aria-label`.
- Section headings use semantic `<h1>`–`<h6>`; docs use a clear heading hierarchy.

## Reduced motion

When the user has **prefers-reduced-motion: reduce** (system or browser setting), the app disables or drastically shortens animations and transitions so motion is minimal. Status indicators (e.g. the pulsing dot on the verify page) will appear static. This is applied globally in `globals.css`.

## High contrast

The dark theme tokens are chosen for WCAG AA contrast. If you need to support **prefers-contrast** or a high-contrast mode, consider adding a media-query override that increases border visibility and/or uses a higher-contrast accent (e.g. a brighter blue or white on dark).

## Usage in Tailwind

Tokens are exposed as Tailwind theme colors (e.g. `bg-sabi-bg`, `text-sabi-muted`, `border-sabi-border`) and in raw CSS as `var(--sabi-*)`.
