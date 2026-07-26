# Design Tokens & Style System — Premium Minimalist

**Direction**: A quiet, precise system for a technical product used daily by professionals — closer to a fine instrument panel or a private-bank statement than a marketing site. One accent, used sparingly, does all the "personality" work; everything else is disciplined neutral tone and exact type. Every color pair below is contrast-checked against WCAG AA, not eyeballed.

**Signature move**: tabular monospace figures wherever real data appears (tables, metrics, IDs). It's the one deliberate flourish — everything else stays quiet around it.

---

## 1. Color System

### Core Palette (named, deliberate — not six competing accents)

| Token | Hex | HSL | Role |
| :--- | :--- | :--- | :--- |
| `ink` | `#16213D` | `hsl(220, 46%, 17%)` | Primary brand weight — filled buttons, primary text-on-light emphasis, key icons |
| `brass` | `#9C7A31` | `hsl(42, 52%, 40%)` | The single accent — focus rings, selected-state indicators, chart/badge fills, icon accents. Clears 3:1 against every surface token in both modes, but **not** 4.5:1 — so it's restricted to non-text UI elements. Never used as body text, and never as a solid filled-button background with text on top (both fail 4.5:1 at this exact shade against `paper`/`ink` text) — use `ink` for filled buttons instead |
| `brass-text` | `#7C5F22` | `hsl(42, 57%, 31%)` | Darkened variant of `brass`, used only where the accent appears **as text or a small icon** and needs 4.5:1 (links, active nav labels) |
| `paper` | `#FAF9F6` | `hsl(48, 20%, 97%)` | App background, light mode — warm off-white, not clinical white |
| `graphite` | `#17181C` | `hsl(228, 8%, 10%)` | App background, dark mode — soft near-black, not pure `#000` |

Two brand colors, not six. Restraint is the point: `ink` carries weight, `brass` carries attention, and both are used deliberately rather than decoratively.

### Surface & Neutral Scale (warm-tinted, not default cool slate)

| Token Name | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `surface-app` | `#FAF9F6` | `#17181C` | Page viewport background |
| `surface-card` | `#FFFFFF` | `#1F2024` | Cards, panels, tables, dialogs |
| `surface-subtle` | `#F3F1EC` | `#26262A` | Table headers, muted rows, input fills |
| `border-default` | `#E8E5DC` | `#33343A` | Decorative dividers, table grid lines — not load-bearing for comprehension, so it's intentionally quiet (no 3:1 requirement per WCAG 1.4.11, which only applies to functional boundaries) |
| `border-strong` | `#918B7B` | `#6E707A` | Input borders, active states, anything a user must visually locate — verified ≥3:1 against card surfaces |
| `text-primary` | `#1A1A18` | `#F5F4F1` | Headings, body text, primary labels — 16.5:1+ contrast both modes |
| `text-secondary` | `#5B5850` | `#ABA89F` | Subtitles, table column headers, icons — 6.7:1+ both modes |
| `text-muted` | `#6B6759` | `#928F8A` | Captions, placeholders, disabled text — deliberately darkened/lightened from a typical "muted" gray so 12px captions still clear 4.5:1 against every surface, including `surface-subtle` (small text isn't exempt just because it's a caption) |

### Semantic Status Tints (desaturated to sit inside the quiet palette, not primary-color Tailwind defaults)

| Semantic State | Base Color | Light Tint Bg | Dark Tint Bg | Text/Icon (Light) | Text/Icon (Dark) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Success** | `#2F6844` (deep forest) | `#EDF3EC` | `#0E1F16` | `#245538` (7.7:1) | `#8FBE9E` (8.2:1) |
| **Warning** | `#8A5A12` (deep ochre) | `#F7EFDE` | `#2E2110` | `#6B4710` (7.2:1) | `#D8B36B` (7.9:1) |
| **Error** | `#7A2331` (deep brick) | `#F7EBEA` | `#2B1113` | `#601A25` (10.8:1) | `#D89AA0` (7.6:1) |
| **Info** | `#35507E` (muted ink-blue) | `#EEF1F6` | `#131D2E` | `#2A3F63` (9.3:1) | `#A9BEDD` (8.9:1) |

All four base colors also clear 3:1 against `surface-card` in both modes for icon-only usage. Semantic color is never the *only* signal — pair with an icon or label, since color-only status indication fails for color-blind users regardless of contrast ratio.

### CSS Custom Properties

```css
:root {
  /* core */
  --color-ink: #16213D;
  --color-brass: #9C7A31;
  --color-brass-text: #7C5F22;

  /* surfaces */
  --color-surface-app: #FAF9F6;
  --color-surface-card: #FFFFFF;
  --color-surface-subtle: #F3F1EC;
  --color-border-default: #E8E5DC;
  --color-border-strong: #918B7B;

  /* text */
  --color-text-primary: #1A1A18;
  --color-text-secondary: #5B5850;
  --color-text-muted: #6B6759;

  /* semantic */
  --color-success: #2F6844;      --color-success-bg: #EDF3EC;   --color-success-text: #245538;
  --color-warning: #8A5A12;      --color-warning-bg: #F7EFDE;   --color-warning-text: #6B4710;
  --color-error: #7A2331;        --color-error-bg: #F7EBEA;     --color-error-text: #601A25;
  --color-info: #35507E;         --color-info-bg: #EEF1F6;      --color-info-text: #2A3F63;
}

[data-theme="dark"] {
  --color-brass-text: #C9A54D;   /* lightened for dark backgrounds */

  --color-surface-app: #17181C;
  --color-surface-card: #1F2024;
  --color-surface-subtle: #26262A;
  --color-border-default: #33343A;
  --color-border-strong: #6E707A;

  --color-text-primary: #F5F4F1;
  --color-text-secondary: #ABA89F;
  --color-text-muted: #928F8A;

  --color-success-bg: #0E1F16;   --color-success-text: #8FBE9E;
  --color-warning-bg: #2E2110;   --color-warning-text: #D8B36B;
  --color-error-bg: #2B1113;     --color-error-text: #D89AA0;
  --color-info-bg: #131D2E;      --color-info-text: #A9BEDD;
}
```

---

## 2. Typography

- **Display/Heading**: `Instrument Sans` — a precise, slightly geometric grotesk with real character at large sizes, used with restraint (headings only, never body copy). Fallback: `"Neue Montreal", system-ui, sans-serif`.
- **Body/UI**: `Public Sans` — highly legible at small sizes, neutral enough not to compete with headings, distinct from the Inter/Roboto everyone else reaches for. Fallback: `system-ui, sans-serif`.
- **Data/Numeric**: `IBM Plex Mono` — tabular figures for every number in a table, metric, or ID column. This is the signature: numbers get their own quiet, precise voice, distinct from prose.

| Level | Size | Line Height | Weight | Tracking | Font | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Display` | `32px / 2rem` | `38px` | `600 (SemiBold)` | `-0.02em` | Instrument Sans | Page hero headers |
| `Heading-1` | `22px / 1.375rem` | `28px` | `600 (SemiBold)` | `-0.015em` | Instrument Sans | Section headers, modal titles |
| `Heading-2` | `17px / 1.0625rem` | `24px` | `600 (SemiBold)` | `-0.005em` | Instrument Sans | Card titles, group headings |
| `Subheading` | `13px / 0.8125rem` | `18px` | `600 (SemiBold)` | `0.02em` | Public Sans | Table headers, form labels (uppercase optional) |
| `Body` | `14px / 0.875rem` | `21px` | `400 (Regular)` | `0` | Public Sans | Standard paragraph, UI copy |
| `Caption` | `12px / 0.75rem` | `16px` | `400 (Regular)` | `0.01em` | Public Sans | Help text, timestamps, badge labels |
| `Data` | `13px / 0.8125rem` | `20px` | `500 (Medium)` | `0` | IBM Plex Mono, `font-variant-numeric: tabular-nums` | Table cell numbers, metrics, IDs, timestamps in data grids |

Headings use tighter negative tracking as size increases — a quiet precision cue rather than decoration. Body copy stays at `0` tracking for maximum legibility in dense CRUD screens.

---

## 3. Spacing, Radii, Shadows & Elevation

### Spacing Grid (4px base, unchanged — it's already correct, not broken)
`space-0.5` (`2px`, hairline gaps between icon and label), `space-1` (`4px`), `space-2` (`8px`), `space-3` (`12px`), `space-4` (`16px`), `space-6` (`24px`), `space-8` (`32px`), `space-12` (`48px`).

### Border Radii Scale (tightened — crisp reads more precise than rounded reads friendly)
- `radius-sm`: `3px` (Badges, small buttons, tooltips)
- `radius-md`: `5px` (Standard buttons, inputs, dropdowns)
- `radius-lg`: `8px` (Cards, table containers, panels)
- `radius-xl`: `10px` (Modals, slide-over sheets)
- `radius-full`: `9999px` (Pill badges, avatars — the one place full rounding stays, since it's functional, not decorative)

### Elevation (mostly border, not shadow — heavy drop shadows read like a dated default)
- **Light mode**: elevation comes from a 1px `border-default` plus a nearly-invisible shadow, not a heavy blur:
  - `shadow-sm`: `0 1px 2px 0 rgba(23, 24, 28, 0.04)` (cards, inputs)
  - `shadow-md`: `0 2px 8px -2px rgba(23, 24, 28, 0.08)` (dropdown menus, popovers)
  - `shadow-lg`: `0 8px 24px -6px rgba(23, 24, 28, 0.12)` (modals, slide-overs)
- **Dark mode**: shadows are nearly invisible on dark backgrounds, so elevation instead comes from a subtle *lighter* border/inset highlight rather than a shadow:
  - `elevation-sm` (dark): `border: 1px solid rgba(255,255,255,0.06)`
  - `elevation-md` (dark): `border: 1px solid rgba(255,255,255,0.08)`, plus `0 4px 16px rgba(0,0,0,0.4)` for real separation (modals only)

---

## 4. Density Modes & Icon Rules

### Density Standards
- **Compact (default)**: table cell padding `py-2 px-3` (8px top/bottom), input height `36px` (`h-9`), spacing `gap-4`.
- **Comfortable**: table cell padding `py-3 px-4`, input height `40px` (`h-10`), spacing `gap-6`.

### Icon System
- **Registry**: Lucide React (or equivalent inline SVG).
- **ViewBox**: `0 0 24 24`.
- **Stroke**: `1.5px` outline — thinner than the default `2px`; at 18–20px render sizes, `2px` strokes look heavy and blunt the precise feel the rest of the system is going for.
- **Sizing**: Default `18px` (`w-4.5 h-4.5`) or `20px` (`w-5 h-5`).
- **Color-plus-icon rule**: any icon carrying semantic meaning (success/warning/error) pairs with a label or distinct shape, never relies on hue alone.

---

## 5. Accessibility & Focus Compliance (WCAG AA — verified, not assumed)

- **Contrast floor**: `4.5:1` for all text regardless of role or size — including 12px captions, which are *not* exempt from the small-text requirement. Every text/background pair in §1 has been computed against the actual sRGB relative-luminance formula, not estimated.
- **Non-text contrast**: `3:1` for functional UI boundaries (input borders, focus rings, active states) — `border-strong` is calibrated to clear this against both surface tokens in both modes. Purely decorative dividers (`border-default`) are exempt under WCAG 1.4.11 and stay deliberately quiet.
- **Focus rings**: every interactive control renders a distinct `brass` focus ring on keyboard navigation: `focus-visible:ring-2 focus-visible:ring-[--color-brass] focus-visible:ring-offset-2`.
- **Interactive IDs**: every input, button, table, and modal has a unique `id` for automated testing and assistive technology.
- **Reduced motion**: any transition/animation respects `prefers-reduced-motion: reduce` — precision doesn't require motion to prove itself.