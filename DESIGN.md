# Grizzly — Product Design Brief
> This document defines the complete visual direction, design system, page inventory,
> component library, and user flows for the Grizzly frontend. It is the source of truth
> for any designer or engineer building the UI.
---
## 1. Design Philosophy
Grizzly is not an app that happens to host writing. It is a place to write and read — and everything else is infrastructure that should disappear.
The design principle is **earned quietness**: restraint that comes from confidence, not laziness. Every element on screen either serves the writer's voice or the reader's focus. If it does neither, it doesn't ship.
Three words that govern every decision: **Unhurried. Legible. Yours.**
- **Unhurried** — no urgency patterns, no engagement metrics surfaced to readers, no badge counts, no infinite scroll. Grizzly doesn't hustle readers.
- **Legible** — typography is the product. Font, size, line height, and measure are first-class design decisions, not defaults.
- **Yours** — the writer's accent color, blog title, and voice are more prominent than any Grizzly branding. The platform recedes.
---
## 2. Design Token System
These tokens are the only source for all visual decisions. Nothing is hardcoded outside this system.
### 2.1 Color
```css
/* Base (light mode) */
--color-canvas:    #F7F7F5;   /* page background — slightly cool off-white */
--color-surface:   #FFFFFF;   /* cards, editor, modals */
--color-ink:       #1A1A18;   /* primary text — near-black with warmth */
--color-muted:     #6B6B68;   /* secondary text, metadata */
--color-faint:     #A8A8A5;   /* placeholder, disabled */
--color-border:    #E2E2DF;   /* dividers, input borders */
--color-border-strong: #C8C8C5; /* focused inputs, active states */
/* Dark mode */
--color-canvas-dark:   #141412;
--color-surface-dark:  #1E1E1B;
--color-ink-dark:      #EEEEE9;
--color-muted-dark:    #8A8A86;
--color-border-dark:   #2E2E2B;
/* Accent (writer-defined, defaults to Grizzly blue) */
--color-accent:        #2D6BE4;   /* default — overridden per blog */
--color-accent-light:  color-mix(in srgb, var(--color-accent) 12%, transparent);
--color-accent-text:   #FFFFFF;   /* text on accent bg */
/* Semantic */
--color-success:   #1A7A4A;
--color-warning:   #92600A;
--color-danger:    #C0392B;
--color-info:      var(--color-accent);
```
**Accent color rule:** The accent color is set by the writer in Blog Settings (`accentColor` field, validated as hex). It is applied as a CSS custom property on the `<html>` element when serving a blog page. The Grizzly dashboard always uses the default blue accent — the writer's accent only appears on their public blog.
### 2.2 Typography
Three typefaces. No others.
```css
/* Reading body — for all post content and blog pages */
--font-reading: 'Lora', Georgia, serif;
/* UI chrome — navigation, dashboard, forms, labels */
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
/* Code blocks */
--font-code: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
```
Load via Google Fonts: `Lora:ital,wght@0,400;0,600;1,400` and `Inter:wght@400;500;600` and `JetBrains+Mono:wght@400;500`.
**Type scale:**
| Token | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| `--text-xs` | 12px | 400 | 1.4 | Metadata, timestamps, labels |
| `--text-sm` | 14px | 400 | 1.5 | Secondary body, captions |
| `--text-base` | 16px | 400 | 1.7 | UI body copy |
| `--text-md` | 18px | 400 | 1.8 | Reading body (default) |
| `--text-lg` | 22px | 600 | 1.3 | Post titles in lists |
| `--text-xl` | 28px | 600 | 1.2 | Blog page post title |
| `--text-2xl` | 36px | 600 | 1.15 | Single post hero title |
| `--text-3xl` | 48px | 600 | 1.1 | Blog name on blog home |
Reading body uses `--font-reading`. All UI chrome uses `--font-ui`.
**Reader controls (on single post pages):**
Readers can adjust their reading experience. These preferences persist in `localStorage` and apply platform-wide.
```
Font family: Lora (serif) | System (sans) | Mono
Font size:   Small (16px) | Default (18px) | Large (21px) | XL (24px)
Line height: Compact (1.6) | Default (1.8) | Relaxed (2.0)
Theme:       Light | Dark | System
```
The controls appear as a small floating panel triggered by a reading settings icon in the top-right of any post. The panel is compact (180px wide), appears on hover/focus, and dismisses on outside click.
### 2.3 Spacing
```css
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  24px
--space-6:  32px
--space-7:  48px
--space-8:  64px
--space-9:  96px
--space-10: 128px
```
### 2.4 Layout
```css
--max-prose:      68ch;    /* max line length for reading — approx 720px at 18px */
--max-content:    720px;   /* max width for blog pages */
--max-dashboard:  1200px;  /* max width for writer dashboard */
--sidebar-width:  240px;   /* dashboard left sidebar */
--border-radius:  6px;     /* default — used for inputs, buttons */
--border-radius-sm: 3px;   /* tags, badges */
--border-radius-lg: 10px;  /* cards */
```
### 2.5 Shadows
Grizzly uses almost no shadows. The exceptions:
```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.06);         /* input focus */
--shadow-md:  0 4px 16px rgba(0,0,0,0.08);         /* floating panels */
--shadow-lg:  0 8px 32px rgba(0,0,0,0.12);         /* modals */
```
---
## 3. Component Library
### 3.1 Buttons
Three variants only.
```
Primary:   bg=accent, text=white, border=none
           hover: brightness(1.1)
           active: scale(0.98)
Ghost:     bg=transparent, text=ink, border=1px solid border
           hover: bg=canvas
Danger:    bg=transparent, text=danger, border=1px solid danger
           hover: bg=danger/10
```
Sizes: `sm` (32px height, 12px/16px padding), `md` (38px height, 16px/20px padding, default), `lg` (44px height, 20px/24px padding).
All buttons: `border-radius: var(--border-radius)`, `font-family: var(--font-ui)`, `font-size: 14px`, `font-weight: 500`, cursor pointer.
Disabled state: `opacity: 0.45`, no pointer events. Never gray the button — just reduce opacity.
### 3.2 Inputs
Single style, two sizes.
```css
input, textarea, select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-family: var(--font-ui);
  font-size: 14px;
  color: var(--color-ink);
  padding: 0 12px;
  height: 38px;   /* sm: 32px */
  transition: border-color 150ms;
}
input:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-light);
}
```
Textarea: same border treatment, `padding: 10px 12px`, no fixed height (min 80px, auto-resize).
### 3.3 Tags
```
background: var(--color-canvas)
border: 1px solid var(--color-border)
border-radius: var(--border-radius-sm)
font-size: 12px
font-family: var(--font-ui)
padding: 2px 8px
color: var(--color-muted)
```
When clicked/active (filter): `background: var(--color-accent-light)`, `color: var(--color-accent)`, `border-color: var(--color-accent)`.
### 3.4 Toast Notifications
Appear bottom-right, stack upward. Max 3 at once.
```
background: var(--color-ink)
color: var(--color-canvas)
border-radius: var(--border-radius)
padding: 12px 16px
font-size: 13px
font-family: var(--font-ui)
max-width: 320px
auto-dismiss: 4s
```
Types: default (ink), success (with left border `--color-success`), error (with left border `--color-danger`).
Never use browser `alert()` or `confirm()`. Toasts for feedback, inline validation for errors.
### 3.5 The Signature Element: Reading Progress Arc
On single post pages, the blog's initial (first letter of blog title) sits in the top-left corner inside a 40px circle. A thin SVG arc traces around it as the reader scrolls, completing at 100%.
```
Container: 40px × 40px
SVG arc: 2px stroke, color=accent, stroke-linecap=round
Initial: 16px, font-ui, font-weight 600, color=ink
Background: surface
Border: 1px solid border
```
The arc is drawn with an SVG `<circle>` using `stroke-dasharray` and `stroke-dashoffset` animated via a scroll event listener. Progress = `scrollY / (documentHeight - viewportHeight)`.
This is the single memorable element that makes Grizzly's reading experience feel considered. It replaces a traditional "X min read" progress bar, which feels clinical.
### 3.6 The Subscribe Bar
Appears at the bottom of every post on a public blog (unless reader is already subscribed).
```
A minimal one-line bar:
[ email input ················ ] [ Subscribe ]
Below: "Join 142 readers. No spam. Unsubscribe anytime."
```
Width: 100% of prose column (68ch). Not a card — a simple inline section separated by a hairline above.
The subscriber count is real (from the API). "No spam. Unsubscribe anytime." is always present.
On submit: inline loading state on button ("Subscribing…"), success state replaces entire bar with "Check your inbox to confirm." No page reload.
---
## 4. Page Inventory
### P1 — Discover Page (root domain)
**URL:** `grizzly.app`
**Purpose:** Entry point for the platform. Shows recent public posts from all blogs.
**Layout:**
```
┌─────────────────────────────────────────────┐
│  grizzly            [Sign in]  [Start writing]│
├─────────────────────────────────────────────┤
│                                             │
│  Discover                                   │
│  Recent writing from across Grizzly         │
│                                             │
│  [all] [tag: tech] [tag: essays] [tag: dev] │ ← filterable tags
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │ Post title going here                   ││
│  │ Excerpt text limited to 2 lines...      ││
│  │ alice.grizzly.app · 3 days ago · #essay ││
│  └─────────────────────────────────────────┘│
│  (divider)                                  │
│  ┌─────────────────────────────────────────┐│
│  │ Another post title                      ││
│  │ ...                                     ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Load more]                                │
└─────────────────────────────────────────────┘
```
**Design notes:**
- Posts as a clean list, not a grid — reading platform, not a magazine
- No post images (images are optional and Grizzly doesn't require them)
- Author attribution links to blog, not profile
- Tags above the list as pill filters — selecting one re-fetches via API
- "Load more" button, not infinite scroll
- Nav: just the Grizzly wordmark left, two CTA buttons right
---
### P2 — Blog Home (`username.grizzly.app`)
**URL:** `username.grizzly.app` or custom domain
**Purpose:** The writer's homepage. All posts, blog info, subscribe.
**Layout:**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│  Alice Zhang                    [accent color →] │
│  Thinking about cities, code, and coffee.        │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  On building in public            Jan 12 · #dev  │
│  What I learned shipping alone for 6 months...  │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  The quiet city                  Dec 4 · #essay  │
│  There is a Lagos nobody writes about...         │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  [Load more]                                     │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  Stay in the loop                                │
│  [ email ···········] [ Subscribe ]              │
│  Join 87 readers. No spam. Unsubscribe anytime.  │
│                                                  │
│  Powered by Grizzly ·  ↗ link to grizzly.app    │
└──────────────────────────────────────────────────┘
```
**Design notes:**
- No navbar chrome — blog home is pure content
- Blog name: `--text-3xl`, `--font-reading`, `--color-ink`
- Description: `--text-md`, `--font-reading`, `--color-muted`
- Accent color applied as a 4px left border on the blog header section, very subtle
- Posts listed as rows with hairline dividers, NOT cards
- Each row: title left (`--text-lg`, `--font-reading`), date + tag right (`--text-sm`, `--font-ui`, `--color-muted`)
- Excerpt: one line, `--text-base`, `--color-muted`, truncated
- Tag filtering: same pill system as Discover
- Subscribe bar at the bottom, always
- "Powered by Grizzly" is the only platform branding — small, muted, linked
---
### P3 — Single Post
**URL:** `username.grizzly.app/post-slug`
**Purpose:** The reading experience. This is the most important page.
**Layout:**
```
┌───────────────────────────────────────────────────┐
│ [◉ A]  Alice Zhang             [Aa] [☾/☀]  [···]  │  ← minimal bar
├───────────────────────────────────────────────────┤
│                                                   │
│                                                   │
│        On building in public                      │
│                                                   │
│        Jan 12, 2025 · 8 min read · #dev #startup  │
│                                                   │
│        ─────────────────────────────────          │
│                                                   │
│        There is a specific silence that           │
│        comes at 2am when you're the only          │
│        person who knows your product exists.      │
│                                                   │
│        [post content continues...]                │
│                                                   │
│        ─────────────────────────────────          │
│                                                   │
│        ← All posts                                │
│                                                   │
│        ─────────────────────────────────          │
│                                                   │
│        Comments (4)                               │
│        [comment list...]                          │
│                                                   │
│        Leave a comment                            │
│        [Name (optional)] [Email (optional)]       │
│        [Comment body···················]          │
│        [Post comment]                             │
│                                                   │
│        ─────────────────────────────────          │
│                                                   │
│        Stay in the loop                           │
│        [email ··············] [Subscribe]         │
│                                                   │
└───────────────────────────────────────────────────┘
```
**Top bar (minimal, hides on scroll down, reappears on scroll up):**
- Left: Reading progress arc + blog initial circle (40px)
- Center: Blog name (`--text-sm`, `--font-ui`, link to blog home)
- Right: `[Aa]` reading settings toggle, `[☾/☀]` theme toggle, `[···]` more (copy link, RSS)
**Post content rules:**
- Max width: `68ch`
- Centered in viewport
- `--font-reading` for all reading text
- `--text-md` (18px) base size, reader-adjustable
- `line-height: 1.8`, reader-adjustable
- `--color-ink` on `--color-canvas`
**Content element styles:**
```
h1: 30px, weight 600, margin-top 48px
h2: 24px, weight 600, margin-top 40px
h3: 20px, weight 600, margin-top 32px
p:  18px, weight 400, margin-bottom 24px
blockquote: left border 3px accent, padding-left 20px, color muted, font-style italic
code (inline): font-code, 15px, bg canvas, border 1px border, border-radius 3px, padding 1px 5px
code (block): font-code, 14px, bg surface (dark: #1E1E1B), border 1px border, border-radius 6px,
              padding 20px 24px, overflow-x auto, line-height 1.6
img: max-width 100%, margin: 32px auto, display block
img caption: text-xs, color muted, text-align center, margin-top -20px
hr (divider): border: none, border-top: 1px solid border, margin: 48px 0
YouTube: responsive 16:9 iframe wrapper, border-radius 6px, overflow hidden
list (ul/ol): padding-left 24px, li margin-bottom 8px
```
**Comments section:**
- Approved comments only visible publicly
- Comment: author name (or "Anonymous"), timestamp, body
- No threading
- Submit form: name optional, email optional, body required (max 2000)
- On submit: `"Your comment is awaiting moderation."` inline, no reload
- Comment email field has `type="email"` but label says "Email (optional, not shown publicly)"
---
### P4 — Subscribe Confirm
**URL:** `grizzly.app/subscribe/confirm?token=...`
```
┌──────────────────────────────────┐
│                                  │
│  ✓                               │
│  You're subscribed               │
│  to Alice Zhang                  │
│                                  │
│  You'll get new posts by email.  │
│  [Read the blog →]               │
│                                  │
└──────────────────────────────────┘
```
Centered, minimal, no nav. Redirects to blog after 3s or on button click.
---
### P5 — Unsubscribe Confirm
**URL:** `grizzly.app/subscribe/unsubscribe?token=...`
```
┌──────────────────────────────────┐
│                                  │
│  You've unsubscribed             │
│  from Alice Zhang                │
│                                  │
│  You won't receive any more      │
│  emails from this blog.          │
│                                  │
│  [Changed your mind? Subscribe again] ← link, not button
│                                  │
└──────────────────────────────────┘
```
No guilt. No dark patterns. Plain statement. Re-subscribe link is small and secondary.
---
### W1 — Register & Login
**URL:** `grizzly.app/register` and `grizzly.app/login`
Same page structure for both. Two-column on desktop (left: form, right: quiet illustration or quote), single column on mobile.
```
┌──────────────────────────────────────────────────┐
│                             │                    │
│  grizzly                    │  "Writing is        │
│                             │   thinking on       │
│  Create your blog           │   paper."           │
│                             │                    │
│  [ Email ················ ] │                    │
│  [ Username ············· ] │                    │
│  [ Password ············· ] │                    │
│                             │                    │
│  [ Create account ]         │                    │
│                             │                    │
│  Already have one? Sign in  │                    │
│                             │                    │
└──────────────────────────────────────────────────┘
```
**Right panel:** Rotating 3 short quotes about writing/publishing. Not testimonials (too marketing). Real quotes from writers — Joan Didion, James Baldwin, Toni Morrison. Plain text, `--font-reading`, italic, `--color-muted`.
**Form rules:**
- Inline validation (on blur, not on type)
- Username: shows `username.grizzly.app` preview live as user types
- Password: toggle visibility icon inside input
- On success: login shows dashboard, register shows editor (first post prompt)
---
### W2 — Writer Dashboard
**URL:** `grizzly.app/dashboard`
**Purpose:** Post management. The writer's home base.
```
┌────────────────────────────────────────────────────────┐
│ grizzly ·  alice.grizzly.app ↗          [avatar ▾]    │
├─────────────┬──────────────────────────────────────────┤
│             │                                          │
│ ○ Posts     │  Posts                  [+ New post]    │
│ ○ Comments  │                                          │
│ ○ Subscribers│  [All] [Published] [Drafts] [Scheduled]│
│ ○ Analytics │                                          │
│ ○ Settings  │  On building in public                  │
│             │  Published · Jan 12 · 342 views · 4 comments│
│             │  ─────────────────────────────────────  │
│             │  The quiet city                          │
│             │  Draft · last edited 2 days ago          │
│             │  ─────────────────────────────────────  │
│             │  Why I stopped using Twitter              │
│             │  Scheduled · Jan 20, 10:00am             │
│             │                                          │
└─────────────┴──────────────────────────────────────────┘
```
**Left sidebar (240px):**
- Platform wordmark top
- Nav items: Posts, Comments, Subscribers, Analytics, Settings
- Active state: `color: accent`, left border 2px accent
- Bottom: avatar + username + sign out link
**Post list rows:**
- Title: `--text-md`, `--font-ui`, `--color-ink`
- Metadata line: status badge + date + view count + comment count — `--text-xs`, `--color-muted`
- Status badge: `published` (green), `draft` (muted), `scheduled` (accent)
- Row hover: `background: --color-canvas`
- Clicking a row opens the editor for that post
- Three-dot menu on hover: Edit, View, Delete
---
### W3 — Markdown Editor
**URL:** `grizzly.app/editor/new` and `grizzly.app/editor/:postId`
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Posts    [Draft]                           [Settings] [Publish]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│  Post title                                                     │
│  ──────────────────────────────────────────────────────────     │
│                                                                 │
│  # Heading                                                      │
│  Write your post in Markdown...                                 │
│                                                                 │
│  > Blockquote looks like this                                   │
│                                                                 │
│  ```javascript                                                  │
│  const x = 1;                                                   │
│  ```                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
**Top bar:**
- Left: `← Posts` back link, post status badge
- Right: `Settings` (opens slide-in panel), `Publish` (primary button)
**Editor area:**
- Title: large, `--text-2xl`, `--font-reading`, `--color-ink`, no border, no label — just a placeholder "Post title"
- Divider below title: 1px `--color-border`
- Body: full-width, `--font-code` for source — this is a raw Markdown editor, not a WYSIWYG
- Monospace body is intentional: writers who choose Markdown are comfortable with plain text
- Syntax highlighting for code blocks: minimal theme (VS Code-style light/dark)
- Auto-save: every 30 seconds, or on blur, silently. "Saved" indicator fades in/out top-right.
- Keyboard shortcuts: `⌘S` save, `⌘⏎` publish, `⌘⇧P` post settings
**Format toggle:** At the top of a new post only, before any content is typed: two large options appear.
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   How would you like to write this post?            │
│                                                     │
│   ┌───────────────────┐  ┌───────────────────┐      │
│   │  # Markdown       │  │  ⊞ Blocks         │      │
│   │                   │  │                   │      │
│   │  Plain text with  │  │  Click to add     │      │
│   │  Markdown syntax  │  │  paragraphs,      │      │
│   │                   │  │  images, embeds   │      │
│   └───────────────────┘  └───────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```
Once chosen, the format is locked for that post (matches the API's `PostFormat` enum).
---
### W4 — Block Editor
Same top bar as Markdown editor. Body area differs.
```
┌───────────────────────────────────────────────────────┐
│ ← Posts  [Draft]                    [Settings][Publish]│
├───────────────────────────────────────────────────────┤
│                                                       │
│  Post title                                           │
│  ────────────────────────────────────────────────     │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ⋮⋮  Paragraph — click to edit, drag to reorder  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  [+] Add block                                        │
│       ├ Paragraph                                     │
│       ├ Heading 1 / 2 / 3                             │
│       ├ Blockquote                                    │
│       ├ Code                                          │
│       ├ Ordered list                                  │
│       ├ Unordered list                                │
│       ├ Image                  ← opens upload picker  │
│       ├ YouTube embed          ← paste URL/ID         │
│       └ Divider                                       │
│                                                       │
└───────────────────────────────────────────────────────┘
```
**Block interaction:**
- Each block is a distinct row with a `⋮⋮` drag handle on the left (appears on hover)
- Click a block to edit in-place
- Press Enter at end of paragraph → creates new paragraph block
- Press Backspace on empty block → deletes it
- `+` button appears below any block on hover, or at the bottom as always-visible
- Block type switcher: clicking the block type icon left of content opens a small dropdown to change type
- No floating toolbars — keep it clean
**YouTube embed block:** paste full URL (`https://youtube.com/watch?v=...`) or video ID. Platform validates and extracts videoId, renders as `youtube-nocookie.com` iframe preview in editor.
---
### W5 — Post Settings Panel
Slides in from the right (320px wide) when `Settings` is clicked. Does not push content — overlays with a backdrop.
```
┌───────────────────────────────┐
│  Post settings            [✕] │
│  ─────────────────────────    │
│  Slug                         │
│  [my-post-slug ·············] │
│  grizzly.app/alice/my-post-slug│
│                               │
│  Excerpt                      │
│  [··························] │
│  [····· textarea ···········] │
│                               │
│  Tags                         │
│  [dev ×] [essay ×] [+ Add]    │
│                               │
│  SEO                          │
│  Meta title                   │
│  [······················60ch] │
│  Meta description             │
│  [···················160ch··] │
│                               │
│  OG image                     │
│  [Upload image] or [URL]      │
│                               │
│  Schedule                     │
│  ○ Publish now                │
│  ○ Schedule for later         │
│     [ date ···] [ time ···]   │
│                               │
│  Danger zone                  │
│  [Delete post]  (ghost/danger)│
└───────────────────────────────┘
```
**Notes:**
- Character counters on meta title (60 max) and meta description (160 max) — turn amber at 80%, red at limit
- Slug field: auto-generated from title, editable. Shows full URL preview below.
- Tags: chip input — type to add, click × to remove. Shows tag suggestions from existing blog tags.
- OG image: can upload (opens upload picker) or paste external URL. Preview thumbnail shown.
- Schedule: date+time pickers only visible when "Schedule for later" selected. Min value = now + 5 minutes.
---
### W6 — Blog Settings
**URL:** `grizzly.app/dashboard/settings`
```
┌────────────────────────────────────────────────┐
│  Blog settings                                 │
│  ─────────────────────────────────────────     │
│  Blog name                                     │
│  [Alice Zhang ···············]                  │
│                                                │
│  Description                                   │
│  [Thinking about cities, code, and coffee.···] │
│                                                │
│  Accent color                                  │
│  [■ #2D6BE4 ·] ← color picker swatch + hex    │
│  Preview: [Subscribe]  ← live button preview  │
│                                                │
│  Footer text                                   │
│  [···············] (optional)                  │
│                                                │
│  ─────────────────────────────────────────     │
│  Custom domain                                 │
│                                                │
│  yourdomain.com → alice.grizzly.app            │
│  [myblog.com ·················]  [Connect]     │
│                                                │
│  Step 1: Add this TXT record to your DNS       │
│  Name: _grizzly-verify.myblog.com              │
│  Value: grizzly-verify-abc123...               │
│  [Copy]                                        │
│                                                │
│  [Check verification]  (polling or manual)     │
│                                                │
│  ─────────────────────────────────────────     │
│  Visibility                                    │
│  ● Public   ○ Private                          │
│                                                │
│  ─────────────────────────────────────────     │
│  [Save changes]                                │
│                                                │
│  ─────────────────────────────────────────     │
│  Danger zone                                   │
│  [Delete blog]  ← requires typing blog slug    │
└────────────────────────────────────────────────┘
```
**Custom domain flow UX:**
1. User types domain and clicks Connect
2. API generates `domainTxtRecord`, returns DNS instructions
3. Page shows DNS instructions + Copy button
4. "Check verification" polls `POST /blogs/me/domain/verify` — shows spinner, then ✓ or × with message
5. On success: shows "✓ myblog.com is connected" with a link to it
**Accent color picker:** Native `<input type="color">` with a styled swatch. Show live preview of the accent on a sample button next to it. No third-party color picker library.
---
### W7 — Subscribers
```
┌──────────────────────────────────────────────────┐
│  Subscribers           87 total                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  [All] [Confirmed] [Pending]                     │
│                                                  │
│  hello@example.com    Confirmed  Mar 3   [✕]     │
│  user@gmail.com       Confirmed  Feb 28  [✕]     │
│  anon@email.com       Pending    Feb 27  [✕]     │
│  ...                                             │
│                                                  │
│  ──────────────────────────────────────────────  │
│  [Load more]                                     │
└──────────────────────────────────────────────────┘
```
Simple table. Email, status, date, remove button. No bulk operations in v1. Status filter tabs.
`[✕]` on hover shows a confirmation inline (`Remove this subscriber? [Yes] [Cancel]`) — no modal.
---
### W8 — Comments Moderation
```
┌──────────────────────────────────────────────────────┐
│  Comments                                             │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  [Pending (3)] [Approved] [Spam]                     │
│                                                      │
│  On "On building in public"         Jan 15, 2:14pm   │
│  Anonymous                                           │
│  "This really resonated with me. I've been building  │
│   in silence for 8 months and..."                    │
│  [Approve] [Spam] [Delete]                           │
│  ──────────────────────────────────────────────────  │
│  On "The quiet city"                 Jan 14, 6:08pm  │
│  Tunde Adeyemi                                       │
│  "The Lagos you're describing sounds like Surulere   │
│   at 6am..."                                         │
│  [Approve] [Spam] [Delete]                           │
│                                                      │
└──────────────────────────────────────────────────────┘
```
Pending tab is default and active. Actions are inline — no modals. Approving moves it to Approved tab, spam to Spam tab. Delete is immediate (hard delete per spec) with a brief undo toast (3 seconds to cancel — frontend only, fires delete API after delay).
---
### W9 — Analytics
```
┌───────────────────────────────────────────────────┐
│  Analytics              [30d ▾] [7d] [90d]        │
│  ──────────────────────────────────────────────   │
│                                                   │
│  342        87         4                          │
│  Total views  Subscribers  Comments               │
│                                                   │
│  ──────────────────────────────────────────────   │
│                                                   │
│  Views per day (sparkline/bar chart)              │
│  ███░░████░░░░███████░░░███░░                     │
│                                                   │
│  ──────────────────────────────────────────────   │
│                                                   │
│  Top posts                                        │
│  On building in public          178 views         │
│  The quiet city                  94 views         │
│  Why I stopped using Twitter     70 views         │
│                                                   │
└───────────────────────────────────────────────────┘
```
Three stat cards at top. One simple bar chart (Chart.js or a minimal SVG bars component — no D3). Top posts list sorted by views in window. Day range selector (7d, 30d, 90d). No more than this — analytics is intentionally minimal and privacy-respecting.
---
### S1 — 404
```
┌──────────────────────────────────┐
│                                  │
│  404                             │
│  This page doesn't exist.        │
│                                  │
│  [← Go back]  [Go to discover]   │
│                                  │
└──────────────────────────────────┘
```
No illustration. No apology. Just the number and a way out.
---
### S2 — Private Blog
```
┌──────────────────────────────────┐
│                                  │
│  This blog is private.           │
│                                  │
│  Alice Zhang hasn't made         │
│  this blog public yet.           │
│                                  │
└──────────────────────────────────┘
```
---
## 5. UI Flows
### F1 — New Writer Onboarding
```
Register page
    │
    ▼ (form submit, success)
Blog auto-created in background
    │
    ▼
Format chooser appears
    │
    ├─ Markdown → Markdown editor
    │                   │
    └─ Blocks   → Block editor
                        │
                        ▼ (write post)
                  Post Settings panel
                        │
                        ▼
                  [Publish] clicked
                        │
                  Publish confirmation:
                  "Publish now?" [Publish] [Schedule]
                        │
                        ▼
                  Post published → toast "Post published ✓"
                  Newsletter job enqueued silently
                        │
                        ▼
                  Redirect to live post (public URL)
```
**First-post empty state in editor:**
Title placeholder: `"Give your post a title"`
Body placeholder (Markdown): `"Start writing, or paste your draft here. Markdown is supported."`
Body placeholder (Blocks): `"Click + to add your first block"`
---
### F2 — Returning Writer: Edit & Publish
```
Login
    │
    ▼
Dashboard (post list, default filter: All)
    │
    ▼ (click a post row)
Editor opens with post content
    │
    ▼ (edit content)
Auto-save every 30s silently
    │
    ▼ (click Publish or ⌘⏎)
    │
    ├─ if draft → publish immediately → toast → live post
    └─ if already published → updates live post → toast "Post updated ✓"
```
**Status transitions:**
```
DRAFT → PUBLISHED  (via Publish button)
DRAFT → SCHEDULED  (via Schedule in Settings panel)
PUBLISHED → DRAFT  (via Unpublish, in ··· menu on post row)
SCHEDULED → DRAFT  (via Cancel schedule, in Settings panel)
SCHEDULED → PUBLISHED (automatically, via BullMQ job)
```
---
### F3 — Post Scheduling Flow
```
In Post Settings panel:
    │
    ▼ Select "Schedule for later"
    │
    ▼ Date/time pickers appear
       Min: now + 5 minutes
       Max: none
    │
    ▼ [Schedule post] button (replaces Publish in top bar)
    │
    ▼ API: POST /posts/:slug/schedule { scheduledAt }
    │
    ▼ Toast: "Scheduled for Jan 20 at 10:00am"
    │
    ▼ Post row in dashboard shows "Scheduled · Jan 20, 10:00am"
    │
    (BullMQ fires at scheduledAt)
    │
    ▼ Post publishes, newsletter sends
```
---
### F4 — Reader: Discover → Subscribe
```
grizzly.app (Discover page)
    │
    ▼ Click post title
    │
    ▼ Full post opens (reader mode)
       - Reading progress arc begins
       - Reader settings accessible via [Aa]
    │
    ▼ Scroll to end of post
    │
    ▼ Subscribe bar appears
       [email input] [Subscribe]
    │
    ▼ Submit email
    │
    ▼ Inline success: "Check your inbox to confirm."
       (no page reload)
    │
    ▼ Subscriber receives confirmation email
       → clicks confirm link
    │
    ▼ grizzly.app/subscribe/confirm?token=...
       "✓ You're subscribed to Alice Zhang"
       "Read the blog →"
    │
    ▼ Welcome email sends (BullMQ job)
       Contains: blog description + 3 recent post links
```
---
### F5 — Subscriber: Newsletter Click → Read → Unsubscribe
```
Subscriber inbox → newsletter email
    │
    ▼ Clicks post link in email
    │
    ▼ Post opens in browser
       (reader mode, no auth required)
       Reading progress arc works
       Reader settings accessible
    │
    ▼ (optional) Clicks unsubscribe link in email footer
    │
    ▼ grizzly.app/subscribe/unsubscribe?token=...
       "You've unsubscribed from Alice Zhang."
       "Changed your mind? Subscribe again" (small link)
    │
    ▼ Subscriber record hard-deleted
```
---
### F6 — Custom Domain Verification
```
Blog Settings → Custom domain section
    │
    ▼ Type domain (e.g. myblog.com)
      Click [Connect]
    │
    ▼ API: POST /blogs/me/domain { domain }
      Returns { txtRecord: "grizzly-verify-abc123" }
    │
    ▼ UI shows DNS instructions:
      Name: _grizzly-verify.myblog.com
      Value: grizzly-verify-abc123
      [Copy value] button
    │
    ▼ User adds TXT record to their DNS
    │
    ▼ User clicks [Check verification]
    │
    ▼ API: POST /blogs/me/domain/verify
      (does DNS lookup)
    │
    ├─ Verified: ✓ "myblog.com is connected"
    │                Tenant cache busted
    │                Custom domain now resolves to blog
    │
    └─ Not yet: ✗ "TXT record not found yet. DNS can take up to 24h."
                   [Check again]
```
---
## 6. Dark Mode
Dark mode is a first-class feature, not a CSS afterthought.
Toggle available on every post via the `[☾/☀]` icon in the reading bar. On the dashboard, it respects OS preference by default with a manual override in the avatar dropdown.
Token mapping:
| Token | Light | Dark |
|---|---|---|
| `--color-canvas` | `#F7F7F5` | `#141412` |
| `--color-surface` | `#FFFFFF` | `#1E1E1B` |
| `--color-ink` | `#1A1A18` | `#EEEEE9` |
| `--color-muted` | `#6B6B68` | `#8A8A86` |
| `--color-border` | `#E2E2DF` | `#2E2E2B` |
Implement via `data-theme="dark"` attribute on `<html>`, CSS custom properties mapped per theme. Transition: `transition: background-color 200ms, color 200ms` on `body`.
Code blocks in dark mode: always use a dark background (`#1E1E1B`) regardless of page theme — they're already dark-optimized.
---
## 7. Responsive Breakpoints
```
Mobile:  < 640px
Tablet:  640px – 1024px
Desktop: > 1024px
```
**Public pages** (discover, blog home, post): naturally single-column, responsive by default. No layout changes needed except padding reduction on mobile.
**Dashboard:** sidebar collapses to a bottom navigation bar on mobile (Posts, Comments, Subscribers, Analytics, Settings as icons + labels). Main content becomes full-width.
**Editor:** full-screen on all breakpoints. Settings panel slides in from bottom on mobile (not right).
**Minimum viable on mobile:** Register/Login, read posts, subscribe, view own posts list. Full editing experience is desktop-first.
---
## 8. Empty States
Every list has an empty state that tells the writer what to do next.
| Screen | Empty state message | CTA |
|---|---|---|
| Dashboard (no posts) | "Your blog is ready. Write your first post." | `[Write a post]` |
| Comments (no pending) | "No comments waiting for review." | — |
| Comments (no approved) | "No approved comments yet." | — |
| Subscribers (none) | "No subscribers yet. Publish a post to start growing your audience." | — |
| Analytics (no data) | "Analytics will appear after your first post is published." | — |
| Discover (no posts) | "No public posts yet. Be the first to publish." | `[Start writing]` |
Empty state copy rule: active voice, no apology, no filler phrases like "Looks like..." or "It seems...". Just the fact and the next step.
---
## 9. Accessibility
- All interactive elements have visible focus rings (`box-shadow: 0 0 0 3px accent-light`)
- Color is never the sole indicator of state — use text + icons alongside color
- All images require `alt` text (enforced in block editor UI)
- `<main>`, `<nav>`, `<article>`, `<aside>` landmarks on every page
- Reading settings respects `prefers-reduced-motion` — no arc animation, no transitions when set
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text (WCAG AA)
- Form inputs all have associated `<label>` elements
---
## 10. What the Frontend Does NOT Do
- No client-side full-text search
- No infinite scroll (load more buttons only)
- No real-time notifications or WebSockets
- No drag-to-reorder for posts in the list
- No rich text editing in the Markdown editor (it is a plain textarea with syntax awareness)
- No image cropping or optimization in the upload UI
- No multi-image upload (one at a time)
- No theme customization beyond accent color
- No analytics export
- No subscriber import
---
*End of design brief. Build public pages first (P1–P3), then auth flows (W1), then dashboard (W2), then editor (W3/W4). The reading experience on P3 is the most important thing Grizzly ships.*
