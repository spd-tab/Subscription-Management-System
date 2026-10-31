---
name: Botanical Precision
colors:
  surface: '#f5fbf2'
  surface-dim: '#d6dcd3'
  surface-bright: '#f5fbf2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5ec'
  surface-container: '#eaf0e6'
  surface-container-high: '#e4eae1'
  surface-container-highest: '#dee4db'
  on-surface: '#171d18'
  on-surface-variant: '#444842'
  inverse-surface: '#2c322c'
  inverse-on-surface: '#edf2e9'
  outline: '#747871'
  outline-variant: '#c4c8c0'
  surface-tint: '#536251'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#121f11'
  on-primary-container: '#798875'
  inverse-primary: '#bbcbb6'
  secondary: '#566155'
  on-secondary: '#ffffff'
  secondary-container: '#d7e3d3'
  on-secondary-container: '#5a6659'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#191c1b'
  on-tertiary-container: '#828482'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e7d1'
  primary-fixed-dim: '#bbcbb6'
  on-primary-fixed: '#121f11'
  on-primary-fixed-variant: '#3c4a3b'
  secondary-fixed: '#dae6d6'
  secondary-fixed-dim: '#becabb'
  on-secondary-fixed: '#141e14'
  on-secondary-fixed-variant: '#3f4a3e'
  tertiary-fixed: '#e1e3e0'
  tertiary-fixed-dim: '#c5c7c4'
  on-tertiary-fixed: '#191c1b'
  on-tertiary-fixed-variant: '#444746'
  background: '#f5fbf2'
  on-background: '#171d18'
  surface-variant: '#dee4db'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  numeric-metric:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.03em
  numeric-table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an architectural, high-trust visual language tailored for executive subscription and revenue intelligence. The brand aesthetic merges European editorial restraint with high-density enterprise precision, moving away from generic blue-tinted SaaS conventions in favor of deep, organic coniferous tones and muted sage neutrals.

The experience evokes calm operational control, mathematical clarity, and institutional prestige. The visual movement relies on **Structured Precision & Tonal Layering**:
- Hyper-crisp 1px hairline geometries delineate functional clusters.
- Ultra-dense, balanced typography optimizes screen real estate for complex tabular metrics and billing graphs.
- Purposeful, restrained color application treats saturated status tokens as precious, low-frequency indicators to avoid visual fatigue across sustained usage.

## Colors

The system uses a strictly calibrated, high-contrast organic palette. Dominant surfaces remain pure `#FFFFFF` with structural tiers framed by `#F4F6F3` containers. Text and high-priority actionables execute in `#0E1B0E` (Deep Conifer), providing near-black contrast while maintaining an authoritative editorial tone.

### Palette Hierarchy & Distribution

- **Primary (`#0E1B0E`)**: Primary interaction states, high-emphasis headings, decisive CTAs, and active icon strokes. 
- **Secondary (`#8A9688`)**: Secondary metrics, column labels, subtle icons, interactive tab bars, and active focus boundaries.
- **Surface Tier (`#F4F6F3`)**: Sub-navigation, table header strips, metric card backgrounds, and drawer headers.
- **Structural Outlines (`#DDE3DA`)**: Explicit 1px hairline dividers, metric card perimeters, input field outlines, and calendar grid structures.

### Semantic Tones

Semantic indicators are deployed with high restraint, always utilizing calibrated foreground/background pairs:
- **Success / Settled**: Foreground `#16A34A` against Background `#DCFCE7` (Active subscriptions, settled invoices, healthy cohorts).
- **Warning / Review**: Foreground `#D97706` against Background `#FEF3C7` (Expiring licenses, manual approval gates, billing anomalies).
- **Destructive / Delinquent**: Foreground `#DC2626` against Background `#FEE2E2` (Overdue collections, failed recurring webhooks, churn alerts).

## Typography

The type ecosystem relies entirely on **Inter** to ensure maximum legibility within high-density tabular and numerical layouts. 

### Typographic Principles

- **OpenType Tabular Figures**: Financial metrics, billing dates, invoice quantities, and MRR calculations must strictly enforce `font-feature-settings: "tnum" on, "cv05" on, "cv11" on` to guarantee vertical character alignment down ledger columns.
- **Negative Letter Spacing**: Any headline set at or above 20px applies tight tracking (`-0.015em` to `-0.025em`) to eliminate optical gaps and retain modern corporate authority.
- **Micro-Labels**: The `label-sm` role serves as the standard for uppercase operational tags (e.g., `NET 30`, `RECURRING`, `DUNNING`). These require `text-transform: uppercase` paired with widened tracking (`0.03em`) to remain sharp and legible at 11px.

## Layout & Spacing

This design system uses a strict **8-point hybrid layout grid** (with a 4-point micro-scale for compact inputs, status badges, and icon buttons). The layout adjusts across three defined tiers:

- **Desktop (1024px and above)**: 12-column responsive fluid grid. Outer frame margin of `margin-desktop` (`2.5rem`), column gap set to `gutter-desktop` (`1.5rem`). Layout prioritizes continuous visibility: fixed collapsible left-side operational navigation, primary dashboard workspace, and context-dependent drill-down panels.
- **Tablet (768px - 1023px)**: 8-column layout. Margin shrinks to `margin-tablet` (`1.5rem`), gutters compress to `gutter` (`1rem`). Data tables transition to horizontally scrollable viewports with locked primary ID columns.
- **Mobile (< 768px)**: 4-column layout. Minimal margin `margin` (`1rem`) maximizes content density. Multi-column financial metrics convert into single-column vertical summaries, and auxiliary actions tuck into sticky bottom navigation rails.

Layout margins and gutters govern macro structure, while `space-xs` through `space-xl` handle internal component relationships:
- Compact metrics utilize `space-sm` (`0.5rem`) internal padding.
- Complex analytics cards enforce `space-lg` (`1.25rem`) padding to create clear negative space around high-density data.

## Elevation & Depth

To avoid visual noise across data-heavy administrative screens, this design system minimizes heavy drop shadows. Depth is achieved via **low-contrast architectural outlines and calibrated surface layering**:

- **Tier 0 (Canvas Base)**: Pure `#FFFFFF`. Hosts standard work surfaces, table row backgrounds, and static form controls.
- **Tier 1 (Surface Containers & Inset Panels)**: Background `#F4F6F3` coupled with a solid 1px border of `#DDE3DA`. Applied to metric overview cards, navigation rails, read-only audit logs, and table header rows.
- **Tier 2 (Popovers, Menus & Filter Dropdowns)**: Background `#FFFFFF`, wrapped in a 1px `#DDE3DA` border, supported by an ultra-subtle ambient shadow: `box-shadow: 0px 4px 16px -2px rgba(14, 27, 14, 0.06), 0px 1px 2px 0px rgba(14, 27, 14, 0.04)`.
- **Tier 3 (Modals & Command Palettes)**: Centered overlay backed by a soft dark backdrop (`rgba(14, 27, 14, 0.40)`). The dialog features a `#FFFFFF` body, 1px `#DDE3DA` perimeter outline, and elevated directional shadow: `box-shadow: 0px 16px 32px -8px rgba(14, 27, 14, 0.12)`.

## Shapes

The shape hierarchy is strictly anchored between **8px and 12px** to balance enterprise structure with modern software polish.

- **Base Radius (0.5rem / 8px)**: Standard functional elements including buttons, input fields, dropdown trigger buttons, segmented controls, quick filter bars, and compact badge chips.
- **Large Radius (1rem / 16px)**: High-level surface groupings, administrative workspace cards, modal dialog wrappers, and nested data tables.
- **Micro Radius (0.25rem / 4px)**: Checkboxes, table row focus indicators, and inline monospace code tags.
- **Strict Prohibition**: Full pill shapes (e.g. 9999px) are avoided to maintain an authoritative, architectural look. All badges, chips, and buttons use consistent corner radii.

## Components

### Buttons
- **Primary**: Background `#0E1B0E`, text `#FFFFFF`, border `none`. Hover: `#1B2E1B`. Active: `#0A130A`. Focus-visible: 2px offset with `#8A9688`.
- **Secondary**: Background `#FFFFFF`, text `#0E1B0E`, border 1px solid `#DDE3DA`. Hover: `#F4F6F3` background with border `#8A9688`.
- **Ghost/Tertiary**: Background `transparent`, text `#0E1B0E`. Hover: `#F4F6F3`.
- **Destructive**: Background `#FEE2E2`, text `#DC2626`, border 1px solid `rgba(220, 38, 38, 0.2)`. Hover: `#DC2626` text, background `#FCD0D0`.
- **Dimensions**: Small (32px height, 12px padding x), Default (40px height, 16px padding x). Corner radius 8px (`0.5rem`).

### Chips & Badges
- **Status Badges**: Padding 2px 8px, font size 11px (`label-sm`), uppercase, radius 4px (`0.25rem`), border 1px solid.
  - Active/Paid: `#DCFCE7` background, `#16A34A` text, `#BBF7D0` border.
  - Pending/Trial: `#FEF3C7` background, `#D97706` text, `#FDE68A` border.
  - Failed/Overdue: `#FEE2E2` background, `#DC2626` text, `#FECACA` border.
- **Filter Chips**: Height 28px, background `#F4F6F3`, border 1px solid `#DDE3DA`, text `#0E1B0E`. Active state: background `#0E1B0E`, text `#FFFFFF`, border `#0E1B0E`.

### Input Fields & Controls
- **Inputs & Selects**: Height 40px, background `#FFFFFF`, border 1px solid `#DDE3DA`, text `#0E1B0E`, radius 8px (`0.5rem`), padding 0 12px. Placeholder: `#8A9688`. Focus: border `#0E1B0E`, box-shadow `0 0 0 1px #0E1B0E`.
- **Checkboxes & Radios**: 16px x 16px. Border 1.5px solid `#8A9688`, radius 4px (`0.25rem`) for checkboxes, circular for radios. Checked state: background `#0E1B0E`, border `#0E1B0E`, checkmark icon pure white.

### Data Cards & Metric Displays
- **Metric Cards**: Background `#F4F6F3`, 1px solid `#DDE3DA` border, radius 12px (`0.75rem`), padding 20px. Includes metric descriptor (`label-md`, color `#8A9688`), numeric value (`numeric-metric`, color `#0E1B0E`), and delta trend badge inline.
- **Workspace Cards**: Background `#FFFFFF`, 1px solid `#DDE3DA`, radius 12px (`0.75rem`), with a header separator border of 1px solid `#DDE3DA`.

### Data Tables & Lists
- **Structure**: Outer boundary 1px solid `#DDE3DA` with 12px rounded container corners.
- **Header Row**: Background `#F4F6F3`, text `#8A9688`, height 36px, `label-sm` uppercase typography, border-bottom 1px solid `#DDE3DA`.
- **Data Rows**: Height 48px, background `#FFFFFF`, border-bottom 1px solid `#DDE3DA`. Hover state: background `#F4F6F3` transition 100ms ease. Numbers align right using tabular figures.