# Gone Calendar Design Guidelines

Visual language for the desktop renderer. Hybrid: Google Calendar chrome (compact top bar, collapsible left sidebar, light default) with One Calendar canvas density (solid event pills, week numbers, mini-calendar color bars).

## Principles

- Clarity: flat event colors, high-contrast text, today marked in red.
- Space efficiency: persistent chrome is small; secondary actions live in overflow.
- Glanceability: mini-calendar color bars and month overflow `+N` show load without opening a day.
- One theme family: sidebar and canvas share light or dark. No mixed dark rail.

## Color tokens

Defined in `src/renderer/src/styles/index.css` and mapped as Tailwind colors `app`, `surface`, `sidebar`, `hairline`, `primary`, `muted`, `today`, `accent`, `hover`.

Light (default):

- App `#F4F5F7`, surface `#FFFFFF`, text `#333333`, muted `#757575`, hairline `#E0E0E0`
- Today `#E63946`, accent `#1A73E8`

Dark:

- App `#252525`, surface `#1E1E1E`, text `#FFFFFF`, muted `#A0A0A0`, hairline `#3E3E3E`

Event defaults (calendar/event color still wins): green `#34C77B`, blue `#4A90E2`, orange `#F3722C`.

## Typography

Font: Inter. Hierarchy:

- H1 period title: ~28px, weight 400
- H2 day groups: 14–16px, weight 600
- Body event titles: 13–14px, weight 400–500
- Caption time/week numbers: 11–12px

## Chrome

Top bar (~48px), at most seven standing controls: sidebar toggle, Today, prev/next, title, search, view dropdown, Create, overflow.

Left sidebar (~256px) collapses to zero width. Contains a real mini-calendar (weekday-aligned grid), calendar list, holiday subscriptions, and tasks as a section (not a tab that hides the calendar).

Lunar labels and week-number toggles live in Settings, not the sidebar.

Print is not a chrome action.

## Motion

Keep calendar interactions on a 140–180ms ease-out curve (`--ease-out` in `index.css`). Hover and drop highlights use opacity overlays so they do not fight cell background classes.

- Month cells (`.gc-cell`): hover wash from text color at ~5% opacity; drop target uses accent wash plus an inset ring.
- Week/Day hour rows (`.gc-hour-slot`): hover only the hovered hour, not the whole day column. Drop target follows the pointer hour.
- Event chips (`.gc-event`): brightness and light lift on hover; source fades while dragging.
- Overlays and dialogs fade/scale in. Full-screen drop chrome does not use backdrop blur.
- Honor `prefers-reduced-motion`.

## Components

- Event pills: 4–6px radius, solid fill, white text, ellipsis, slight brightness and lift on hover; faded while the chip is being dragged.
- Today: filled red circle on the date numeral.
- List date headers: pill shape, sticky, red text for today and weekends.
- Year view: color wash behind dates that have events.

## Theme

`settings.theme` is `light` | `dark` | `system`. Default is `light`. Wallpaper (R3) stays optional and off by default.
