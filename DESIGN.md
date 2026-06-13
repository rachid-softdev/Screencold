---
name: ScreenCold
description: B2B prospecting automation — audit websites, generate personalized outreach emails
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  info-surface: "#eff6ff"
  secondary: "#7c3aed"
  accent: "#ea580c"
  success: "#16a34a"
  success-light: "#dcfce7"
  warning: "#d97706"
  warning-light: "#fef3c7"
  error: "#dc2626"
  error-light: "#fee2e2"
  neutral-bg: "#f9fafb"
  surface: "#ffffff"
  ink: "#111827"
  ink-secondary: "#6b7280"
  ink-muted: "#9ca3af"
  border: "#e5e7eb"
  border-light: "#f3f4f6"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  xxl: "3rem"
  section: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    typography: "{typography.label}"
    border: "1px solid {colors.border}"
  button-secondary-hover:
    backgroundColor: "{colors.neutral-bg}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
  card-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.border}"
    padding: "1.5rem"
  card-header:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border-light}"
    padding: "1rem 1.5rem"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    border: "1px solid {colors.border}"
    padding: "0.5rem 0.75rem"
  input-focus:
    border: "2px solid {colors.primary}"
  nav-link:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "0.625rem 0.75rem"
  nav-link-active:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.primary}"
  badge-default:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
  badge-outline:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    border: "1px solid {colors.border}"
    padding: "0.125rem 0.625rem"
---

# Design System: ScreenCold

## 1. Overview

**Creative North Star: "The Prospect File"**

ScreenCold's visual system is a clean, organized dossier — every piece of information in its place, nothing decorative that doesn't earn its keep. The design follows a B2B utility logic: the interface exists to move the user from URL → audit result → email as efficiently as possible. There is no wasted motion.

The system explicitly rejects the "cold email bro" aesthetic (dark landing pages, aggressive gradients, hype badges) and the generic enterprise SaaS template (overly rounded everything, heavy shadows, feature walls). Instead, it favors flat surfaces with clear spatial hierarchy, restrained use of the Signal Blue accent, and typographic clarity.

**Key Characteristics:**
- Flat-by-default surfaces — depth comes from spatial layout and borders, not shadows
- Signal Blue as a deliberate accent (≤15% of any screen), never decorative
- French-native prose throughout — no franglais, no translated-from-English patterns
- Typography-only hierarchy — weight and size distinguish levels, not color or decoration
- Sparse, intentional motion — feedback and transitions, no choreographed entrances

## 2. Colors

A restrained palette built around a reliable Signal Blue anchor, with semantic colors reserved for data and status.

### Primary

- **Signal Blue** (`#2563eb` / `oklch(0.546 0.245 262.88)`): The single accent color. Used for primary CTAs, active navigation states, and data-affirmative highlights. Its low-frequency deployment (≤15% of surface area) is deliberate — when it appears, it means action.

### Secondary

- **Accent Violet** (`#7c3aed` / `oklch(0.474 0.258 293.52)`): A sparingly used secondary accent for pro/beta badges and tier differentiation in pricing tables. Never in competition with Signal Blue.

### Semantic

- **Confirm Green** (`#16a34a` / `oklch(0.593 0.187 148.85)`): Success states, checkmarks, positive indicators.
- **Caution Amber** (`#d97706` / `oklch(0.628 0.152 71.27)`): Warnings, credit depletion warnings, mid-status.
- **Alert Red** (`#dc2626` / `oklch(0.524 0.222 21.49)`): Errors, destructive actions, critical status.

### Neutral

- **Sheet White** (`#ffffff`): Card surfaces, modal backgrounds, sidebar. The primary surface color.
- **Off-Sheet** (`#f9fafb` / `oklch(0.973 0.003 264.54)`): Page backgrounds (dashboard, auth pages), alternating rows, section highlights.
- **Ink** (`#111827` / `oklch(0.195 0.021 264.36)`): Primary body text, headings. High contrast on all surfaces.
- **Ink-Light** (`#6b7280` / `oklch(0.532 0.029 264.36)`): Secondary text, metadata, breadcrumbs.
- **Ink-Muted** (`#9ca3af` / `oklch(0.674 0.026 264.36)`): Placeholder text, disabled labels, footnote text.
- **Divider** (`#e5e7eb` / `oklch(0.888 0.013 264.36)`): Borders, separators, table rows.
- **Divider-Light** (`#f3f4f6` / `oklch(0.929 0.008 264.36)`): Subtle section boundaries, hover states.

### Named Rules

**The Signal Rule.** The Signal Blue appears on ≤15% of any given screen. Its rarity is what makes it meaningful. If a layout needs more blue than that, use borders or surface tints instead of filling more area.

**The One-Voice Rule.** Semantic colors (Confirm Green, Caution Amber, Alert Red) are used only for their named purpose. Never apply green for decoration, red for branding, or amber for visual interest. When they appear, the user knows it carries information.

## 3. Typography

**Body Font:** Inter (with system-ui, sans-serif fallback)
**Mono Font:** JetBrains Mono (with monospace fallback)

**Character:** A single geometric sans-serif (Inter) across the entire system, leveraged through weight and size contrast rather than pairing. This avoids the friction of mismatched font personalities and keeps rendering fast. JetBrains Mono provides technical differentiation for code blocks, API keys, and data values.

### Hierarchy

- **Display** (700, `clamp(2rem, 5vw, 3.75rem)`, 1.1): Marketing hero headings only. Capped at ~60px to avoid shouting. Uses `text-wrap: balance`.
- **Headline** (700, `clamp(1.5rem, 3vw, 2.25rem)`, 1.2): Section titles on landing pages, feature headings, empty-state headings.
- **Title** (600, 1.125rem, 1.4): Card titles, modal headers, sidebar section labels.
- **Body** (400, 1rem, 1.6): Paragraph text, descriptions, dashboard content. Line length capped at 70ch via container max-width.
- **Body Small** (400, 0.875rem, 1.5): Secondary information, metadata, timestamps.
- **Label** (500, 0.875rem, 1.4): Button text, input labels, tab labels, navigation items.
- **Mono** (400, 0.875rem, 1.5): Code blocks, API responses, data values in audit results.

### Named Rules

**The Weight-Only Rule.** Hierarchy is communicated through font weight and size alone. Never use color, italics, underlines, or uppercase to distinguish heading levels. The only exception: hyperlinks, which use Signal Blue.

## 4. Elevation

ScreenCold uses a **flat-by-default, layered-when-needed** elevation model. At rest, surfaces stack through borders (`1px solid border`) and background color (`surface` on cards, `off-sheet` on page). Shadows appear only as affordances for interactive or spatial needs:

- Hover feedback on interactive elements (cards that click, buttons)
- Dropdown menus and overlays that need separation from the content layer
- Modal backdrops that push content into the background

The system avoids the heavy shadow vocabulary of enterprise SaaS. Shadows are subtle, warm-toned, and tight.

### Shadow Vocabulary

- **Soft** (`0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)`): Default card shadow at rest.
- **Medium** (`0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.1)`): Elevated elements (dropdowns, tooltips, hovered cards).
- **Hard** (`0 10px 40px -10px rgba(0, 0, 0, 0.2)`): Modals, dialogs, notification toasts.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to interaction state (hover, focus, elevation) or to separate overlays from content. If a card doesn't click or contain interactive content, it should not cast a shadow.

## 5. Components

### Buttons

Buttons are clean, purpose-specific, and communicate their action through background color rather than shape or icon treatment.

- **Shape:** Rounded softly (`rounded-lg`, 0.5rem) — present but not prominent.
- **Primary (Signal Blue):** `bg-info-600 (#2563eb)`, white text, 0.5rem horizontal padding. Hover deepens to `#1d4ed8`. Uses label weight (500).
- **Secondary:** White background, Ink text, `1px` Divider border. Hover adds Off-Sheet background. Used for non-primary actions alongside a primary CTA.
- **Outline (Ghost):** Transparent background, Ink-Light text. Hover adds subtle Divider-Light background. Used for inline actions, table row actions, settings.
- **Destructive (Alert Red):** `bg-error-600 (#dc2626)`, white text. Used only for destructive irreversible actions.
- **Loading state:** Replaces icon/children with a spinning `Loader2` icon, disables interaction.
- **Sizes:** sm (h-8, 12px padding), md (h-10, 16px padding), lg (h-12, 24px padding).

### Cards

Cards are used where the content genuinely benefits from a bounded container — audit results, dashboard stats, pricing options. They are **not** the default container for every element.

- **Corner Style:** Rounded (`rounded-xl`, 0.75rem).
- **Background:** Sheet White.
- **Border:** `1px solid` Divider.
- **Shadow Strategy:** Soft shadow at rest. Medium on hover only when the card is clickable.
- **Internal Padding:** `1.5rem` (p-6) for content, `1rem 1.5rem` (px-6 py-4) for header/footer.
- **Nested cards are prohibited.** If content needs grouping within a card, use a border or background shift instead.

### Inputs & Fields

Text inputs follow a utilitarian stroke style — visible but not heavy.

- **Style:** `1px solid` Divider border, Sheet White background, 0.5rem radius.
- **Focus:** 2px Signal Blue ring (focus:ring-2). No glow, no box-shadow shift.
- **Label:** Above the field (stacked, not inline), Label weight (500), Ink color. `1.5rem` gap below label.
- **Error:** Alert Red border (`border-red-300`), light red ring on focus. Error message appears below the field in Alert Red text at body-small size (0.875rem).
- **Helper text:** Ink-Muted, body-small, below field.
- **Disabled:** Off-Sheet background, Ink-Muted text, cursor-not-allowed.

### Badges / Chips

Compact labels for plan tier, status, feature tags.

- **Style:** Rounded-full (pill shape), compact (2px 10px).
- **Default:** Off-Sheet background, Ink text.
- **Success:** Confirm Green-light background, Confirm Green text.
- **Warning:** Caution Amber-light background, Caution Amber text.
- **Destructive:** Alert Red-light background, Alert Red text.
- **Outline:** Transparent background, 1px Divider border, Ink-Light text.

### Navigation

**Marketing navigation (Header):** A centered, single-row bar with logo-left, links-center, CTA-right. The current implementation uses a `bg-white/80 backdrop-blur-sm` sticky header with a thin bottom border. Mobile nav is a full-width drawer below the header.

**Dashboard navigation (Sidebar):** Left-anchored, fixed, 64-column. Logo and collapse toggle at top, nav items in the middle, user card at bottom. Active item uses `info-50` background and Signal Blue text. Collapsed state shows icons only (16-wide). The sidebar has its own scroll context; the main content area scrolls independently.

### Loading & Empty States

- **Loading:** Centered spinner (1/4 circle arc in Signal Blue) on a clean white or Off-Sheet background, accompanied by "Chargement..." in Ink-Muted text.
- **Empty states:** A bordered dashed container (2px dash) with a centered icon in `info-100` circle, heading, description, and one or two CTAs. Used when the user has no audits yet, no campaigns yet, etc.

## 6. Do's and Don'ts

### Do:

- **Do** use Signal Blue sparingly — it signals action or active state, never decoration.
- **Do** keep surfaces flat by default; use borders and background tint for spatial separation.
- **Do** write UI copy in natural French for a B2B audience — not translated English, not franglais.
- **Do** use the full typographic hierarchy (weight + size) before reaching for color or icons to convey importance.
- **Do** show the audit evidence (screenshots, scores, specific issues) before the configuration form.
- **Do** guide users in a linear flow: URL → audit → email.
- **Do** use semantic colors only for their named purpose (green for success, red for errors, amber for warnings).
- **Do** respect `prefers-reduced-motion` — animations enhance but never gate content.

### Don't:

- **Don't** use gradient text anywhere (`background-clip: text` with gradient). Emphasis via weight or size only.
- **Don't** apply side-stripe borders (colored `border-left` or `border-right > 1px`) on cards or callouts.
- **Don't** use glassmorphism or backdrop blur as a decorative default.
- **Don't** put numbered section markers (01 / 02 / 03) as eyebrow labels on every section — only use numbers when the content is actually a sequence.
- **Don't** use the hero-metric pattern (big number + small label + gradient accent) — SaaS cliché.
- **Don't** create identical card grids with icon + heading + text repeated endlessly — vary the pattern.
- **Don't** use dark landing pages, aggressive CTAs, hype badges, or "cold email bro" visual language.
- **Don't** nest cards — if content needs grouping within a card, use a background tint or border shift.
- **Don't** use muted gray for body text on tinted backgrounds — body text must hit ≥4.5:1 contrast ratio.
- **Don't** overuse uppercase tracking on section labels — one deliberate kicker is voice; every section is grammar.
