# Gone Calendar Design Guidelines

Visual language for the desktop renderer. Minimalist Notion + Notion Calendar aesthetic: warm, clean off-white / deep charcoal canvas, soft pastel event palette, quiet hairline borders, and disciplined corner radius (<5px on controls and sidebar).

## Principles

- **Clarity & Calm:** Soft pastel event colors, high-contrast typography, quiet today indicator in Notion coral `#eb5757`.
- **Minimalist Chrome:** Compact top bar (~48px), collapsible left sidebar (~256px), secondary actions tucked cleanly into overflow menus.
- **Unified Notion Tones:** Shared canvas and card language between sidebar, header, dialogs, and calendar views. No loud saturated gradients or AI-purple slop.
- **Restrained Corner Radii:** Strictly `<5px` (`3px` for controls/chips/sidebar items, `4px` for dialogs/popovers). The only pill allowed is the `ToggleSwitch` track.

## Color Tokens

Defined in `src/renderer/src/styles/index.css` and mapped as Tailwind theme tokens `app`, `surface`, `sidebar`, `hairline`, `primary`, `muted`, `today`, `accent`, `hover`.

### Light Mode (Default Notion Theme)
- Canvas / App: `#f7f6f3` (Warm off-white paper)
- Surface / Cards: `#ffffff`
- Sidebar: `#fbfbfa`
- Hairline Border: `#e9e9e7`
- Primary Text: `#37352f` (Notion signature charcoal)
- Muted Text: `#787774`
- Hover Fill: `#efefee`
- Today Mark: `#eb5757` (Notion soft coral red)
- Accent Mark: `#2383e2` (Notion blue)

### Dark Mode (Notion Dark Theme)
- Canvas / App: `#191919` (Notion dark canvas)
- Surface / Cards: `#202020` (Notion dark surface)
- Sidebar: `#191919`
- Hairline Border: `#2e2e2e`
- Primary Text: `#ebebeb`
- Muted Text: `#9b9a97`
- Hover Fill: `#282828`
- Today Mark: `#eb5757`
- Accent Mark: `#529cca` (Soft pastel blue)

### Soft Pastel Event Palette
Replaced saturated Google primaries with gentle pastel tones:
- Soft Blue: `#529cca`
- Soft Sage Green: `#52b788`
- Soft Peach / Amber: `#ea9a5f`
- Soft Lavender: `#9a6dd7`
- Soft Coral / Red: `#eb5757`
- Soft Teal: `#4dab9a`
- Soft Rose Pink: `#e06f9f`
- Soft Slate Gray: `#868e96`
- Soft Honey Gold: `#e3b341`

## Typography

Font: Inter. Hierarchy:
- H1 period title: ~28px, weight 400
- H2 day groups: 14–16px, weight 600
- Body event titles: 13–14px, weight 400–500
- Caption time/week numbers: 10–12px

## Chrome & Sidebar Specifications

### Radius Tokens
| Token | Value | Usage |
|---|---|---|
| `--radius-control` | `3px` | Inputs, checkboxes, buttons, chips, sidebar cards & cells |
| `--radius-dialog` | `4px` | `.gc-dialog`, dropdown popovers, hover flyouts |

### Sidebar Rules (< 5px Radius)
- **Tasks Launcher Card:** `rounded-[4px]`, `border-hairline`, `bg-surface`, `hover:bg-hover`, `text-primary`.
- **Tasks Icon Box:** `rounded-[3px]`, `bg-hover`, `text-muted`.
- **Tasks Counter Badge:** `rounded-[3px]`, `bg-accent/15 text-accent text-[10px]`.
- **Mini Calendar Cells:** `rounded-[3px]`, today indicator `rounded-[3px]` with `TODAY_COLOR` (`#eb5757`). Event bars `rounded-[1px]`.
- **Calendar Items:** `rounded-[3px]`, checkboxes `rounded-[3px]`, RO tag `rounded-[3px]`.
- **Holiday Toggle Cards:** `rounded-[4px]`, `border-hairline`, active state `bg-accent/10 border-accent/30 text-primary`, badge `rounded-[3px] bg-accent/20 text-accent`.
- **Footer Status:** `rounded-[3px]` refresh button, soft pastel emerald `#52b788` dot.

### Header Rules
- **Task Launcher Button:** `gc-icon-btn` with `text-muted hover:text-primary`, counter badge `rounded-[3px] bg-accent text-[8px] font-bold text-white`.
- **Controls & Buttons:** `gc-btn`, `gc-btn-primary`, `ViewSwitcher`, `OverflowMenu` all follow `var(--radius-control)`.

## Motion & Interaction

- Keep calendar interactions on a 140–180ms ease-out curve (`--ease-out` in `index.css`).
- Month cells (`.gc-cell`): subtle hover wash at ~5% opacity.
- Week/Day hour rows (`.gc-hour-slot`): hover only the hovered hour. Timed drag uses a 15-minute drop line, not a full-hour highlight.
- Event chips (`.gc-event`): slight lift and brightness increase on hover.
- Overlays and dialogs fade/scale in smoothly.
- Honor `prefers-reduced-motion`.

## Forms & Dialogs

- **Page-like Dialogs:** (Event editor, Task pane, Theme settings) use `FormRow` property rows with ghost inputs.
- **Settings-like Dialogs:** (CalDAV connect, Account manager) use boxed inputs (`variant="boxed"`).
- **Focus state:** 1px `accent` outline, zero glow rings or saturated shadows.
