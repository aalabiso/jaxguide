# Jacksonville Airbnb Guest Guide — Project Context

## Overview

This project is a destination guidebook for an Airbnb property in Jacksonville, FL. It exists in two formats: a **17-page print-ready PDF** (letter size, designed for physical printing) and a **responsive web version** (single-page scrolling site). The web version includes a link to download the PDF. A standalone **monthly events** supplement is also produced as a separate 2-page PDF.

The long-term vision is to productize this into **Stadius** (Stay + Radius) — a SaaS guidebook builder for short-term rental hosts. The product spec lives in `docs/PRODUCT-SPEC-Stadius.md`.

**Owner:** Alex (aalabiso@gmail.com)

---

## Directory Structure

```
jaxguide/
├── CLAUDE.md                          ← THIS FILE — project context for Claude sessions
├── print-sources/                     ← All print-ready HTML + images (NOT deployed)
│   ├── main-guide.html                ← Main guide print HTML (19 pages, 8.5×11in)
│   ├── house-rules.html               ← House rules print HTML (1 page)
│   ├── march-events.html              ← March 2026 events print HTML (2 pages)
│   └── images/                        ← Source images used by print HTML files
├── public/                            ← WEB DEPLOYMENT ROOT — deploy this folder
│   ├── index.html                     ← Responsive web guide
│   ├── house-rules.html               ← Standalone web house rules page
│   ├── events/
│   │   └── index.html                 ← March events web page (served at /events)
│   ├── Jacksonville-Guide.pdf         ← Main guide PDF (with QR code)
│   ├── Jacksonville-House-Rules.pdf   ← House rules PDF
│   ├── Jacksonville-March-2026-Events.pdf ← March events PDF (with QR code)
│   └── assets/
│       ├── css/style.css              ← Extracted stylesheet
│       ├── js/main.js                 ← Scroll animations, back-to-top, nav behavior
│       ├── images/                    ← All images for web version
│       └── fonts/                     ← Empty (using Google Fonts CDN)
├── scripts/
│   ├── generate-print-pdf.js          ← Puppeteer: main-guide.html → PDF
│   ├── generate-house-rules-pdf.js    ← Puppeteer: house-rules.html → PDF
│   └── generate-march-pdf.js          ← Puppeteer: march-events.html → PDF
├── docs/
│   └── PRODUCT-SPEC-Stadius.md        ← Full product spec for the Stadius SaaS app
├── package.json                       ← Node deps (puppeteer-core)
├── package-lock.json
└── node_modules/
```

---

## How Things Work

### Print PDF Generation

All print source HTML lives in `print-sources/`. The main guide (`main-guide.html`) has 19 `<div>` elements, each exactly 8.5in × 11in with `overflow: hidden` and `page-break-after: always`. Puppeteer renders these to pixel-perfect PDFs.

**To regenerate PDFs after editing:**
```powershell
cd "C:\Users\aalab\OneDrive\Desktop\Jax Guide"
node scripts/generate-print-pdf.js        # Main guide → public/Jacksonville-Guide.pdf
node scripts/generate-house-rules-pdf.js   # House rules → public/Jacksonville-House-Rules.pdf
node scripts/generate-march-pdf.js         # March events → public/Jacksonville-March-2026-Events.pdf
```

Each script outputs to both `print-sources/` (intermediate) and `public/` (deployed). The scripts use `puppeteer-core` with the system Chrome installation at `C:\Program Files\Google\Chrome\Application\chrome.exe`.

**Key print HTML constraints:**
- Each page div must not exceed 11in height — content that overflows is clipped (invisible in PDF)
- `@page { size: 8.5in 11in; margin: 0; }` — zero-margin letter size
- Padding is handled per-page: `padding: 0.5in 0.6in`
- Images use relative paths to `images/` (inside `print-sources/`)
- Google Fonts are loaded via CDN `<link>` tags — requires network when generating PDF

### Web Version

The web version lives in `public/` and is what gets deployed. It's a responsive single-page scrolling site with:
- Sticky navigation with section anchors
- Full-width gradient section intros
- Responsive card grids (3-col → 2-col → 1-col)
- Scroll-triggered fade-in animations (IntersectionObserver)
- Back-to-top button
- PDF download link in the footer

**To edit the web version:**
- Edit `public/index.html` for content/structure changes
- Edit `public/assets/css/style.css` for styling
- Edit `public/assets/js/main.js` for interactivity
- Images are in `public/assets/images/`

### Monthly Events

Monthly events are standalone 2-page print PDFs. Print sources live in `print-sources/`, web versions in `public/events/`.

**To create a new month:** Duplicate `print-sources/march-events.html`, update the content, create a corresponding generation script, and create a web version in `public/events/`.

---

## Design System

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Teal | `#007B8A` | Primary, links, section accents |
| Teal Dark | `#00596A` | Hover states, dark gradients |
| Teal Light | `#D4EDF0` | Card tags, light backgrounds |
| Ocean | `#1A4B6E` | Secondary, dark section intros |
| Sand | `#F5E6C8` | Warm backgrounds |
| Orange | `#E8722A` | Accent, CTAs, stat numbers, borders |
| Orange Light | `#F9A96E` | Highlights on dark backgrounds |
| Coral | `#E84E4E` | Arts/culture accent |
| Green | `#2D7D46` | Golf, nature, outdoors accent |
| Charcoal | `#1C2B35` | Body text, dark backgrounds |
| Warm Gray | `#5C6670` | Secondary text |
| Cream | `#FFFDF7` | Light page backgrounds |
| Gold | `#C8922A` | Trivia borders, premium accents |

### Font Stack
| Font | Usage | Weight |
|------|-------|--------|
| **Playfair Display** | Section titles, card titles | 400, 700, 900 |
| **Nunito** | Body text, descriptions | 400, 600, 700 |
| **Bebas Neue** | Labels, eyebrows, stat numbers | 400 |
| **Merriweather** | Occasional body italic | 300, 400 |

All loaded via Google Fonts CDN.

### Block Types (Print)
These are the reusable content blocks in the print HTML:

| Block | CSS Class | Description |
|-------|-----------|-------------|
| Content Card | `.card` + `.card-grid-2` or `.card-grid-3` | Main content unit — emoji, title, description, tag |
| Team Card | `.team-card` | Sports teams — name, league, description, venue |
| Restaurant Card | `.rest-card` | Restaurants — name, category, description, must-try, price |
| Brewery Card | `.brewery-card` | Breweries — area, name, description |
| Golf Card | `.golf-card` | Golf courses — name, badge, description |
| Venue Card | `.venue-card` | Arts venues — type, name, description |
| Kids Card | `.kids-card` | Family activities — name, age range, description |
| Trip Card | `.trip-card` | Day trips — distance, name, description |
| Stats Bar | `.stats-bar` | Row of 4-5 stats with big numbers |
| Fun Fact | `.fun-fact` | Bordered callout with label + text |
| Trivia Box | `.trivia-box` | Dashed-border knowledge box |
| Highlight Strip | `.highlight-strip` | Colored strip with icon + text |
| Featured Image | `.featured-image` | Image with gradient overlay caption |
| Split Feature | `.split-feature` | 50/50 image + text grid |
| Mosaic Grid | `.mosaic-grid` | 1 large + 2 small image layout |
| Section Header | `.section-header` | Icon + label + title + intro paragraph |
| Card Page Header | `.card-page-header` | Mini header at top of card-only pages |

### Page Types (Print)
1. **Cover page** (`.cover-page`) — full-bleed background image with gradient overlay, centered text, badge row
2. **Section intro** (`.page-dark-*`) — dark gradient background, section header, hero image, trivia/fun facts, stats bar
3. **Content/card page** (`.page-*`) — light background, card-page-header, card grids, supplementary blocks fill remaining space
4. **Credits page** — quick reference lists, credits, footer

### Print Page Backgrounds
- Light: `.page-cream`, `.page-teal`, `.page-ocean`, `.page-charcoal`, `.page-orange`, `.page-green`, `.page-sand`
- Dark: `.page-dark-teal`, `.page-dark-ocean`, `.page-dark-charcoal`, `.page-dark-orange`, `.page-dark-green`

---

## Content Sections (17 Pages)

| Page | Title | Type | Background |
|------|-------|------|------------|
| 1 | Cover | Cover | Skyline photo + gradient |
| 2 | Jacksonville at a Glance | Content | Cream |
| 3 | Neighborhoods & History | Section Intro | Dark Teal |
| 4 | Neighborhoods (cards) | Cards | Light Teal |
| 5 | Beaches & Outdoor Adventures | Content + Cards | Sand |
| 6 | Beaches Tips & More | Cards | Sand |
| 7 | Jacksonville Sports Scene | Section Intro + Cards | Dark Charcoal |
| 8 | Food & Dining | Section Intro + Cards | Dark Orange |
| 9 | More Restaurants | Cards | Cream |
| 10 | Craft Breweries & Distilleries | Cards | Cream |
| 11 | Golf — First Coast Style | Section Intro | Dark Green |
| 12 | Golf Courses | Cards | Light Green |
| 13 | Arts, Culture & Entertainment | Section Intro + Cards | Dark Ocean |
| 14 | Events & Festivals | Content | Orange |
| 15 | Kids & Family Activities | Cards | Cream |
| 16 | Day Trips & Surrounding Areas | Cards | Cream |
| 17 | Quick Reference & Credits | Content | Charcoal |

---

## Common Editing Tasks

### Add a new restaurant/brewery/attraction card
1. Open `print-sources/main-guide.html`
2. Find the relevant section (search for the page comment, e.g., `<!-- PAGE 9: MORE RESTAURANTS -->`)
3. Copy an existing card block and modify the content
4. **Watch page height** — if adding cards pushes content past 11in, it will be clipped in the PDF. Either remove a card or move content to a new page.
5. Regenerate PDF: `node scripts/generate-print-pdf.js`
6. Update the web version (`public/index.html`) with the same content change

### Update the web version after print changes
The web version (`public/index.html`) and print version (`print-sources/main-guide.html`) have the same content but different HTML structure. Changes to one do NOT automatically propagate to the other. After editing print content, manually update the corresponding section in `public/index.html`.

### Add a new monthly events page
1. Copy `print-sources/march-events.html` as a template
2. Update the month name, event cards, dates, and descriptions
3. Create a corresponding generation script in `scripts/`
4. Generate the PDF: `node scripts/generate-{month}-pdf.js`
5. Create a web version in `public/events/`

### Add new images
1. Place the image file in `print-sources/images/` (for print HTML) AND `public/assets/images/` (for web)
2. Reference in print HTML as `src="images/filename.jpg"`
3. Reference in web HTML as `src="assets/images/filename.jpg"`
4. Recommended: use JPG for photos, PNG for graphics with transparency, WebP for modern optimization

### Deploy the web version
The `public/` folder is a fully self-contained static site deployed at **jaxguide.ninethree.co**. The GitHub repo is at `https://github.com/aalabiso/jaxguide`.

---

## Tech Stack

- **Print rendering:** Puppeteer (via `puppeteer-core`) + system Chrome on Windows
- **Node.js:** v24.13.1 (via NVM on Windows)
- **Local dev:** Windows machine, Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Web version:** Pure HTML/CSS/JS — no framework, no build step
- **Fonts:** Google Fonts CDN (Playfair Display, Nunito, Bebas Neue, Merriweather)

---

## Future: Stadius Product

The full product spec for building this into a SaaS platform is at `docs/PRODUCT-SPEC-Stadius.md`. Stack: Laravel 12 + Vue 3 + Inertia.js + MySQL + Browsershot. Local dev via Laravel Herd Pro. See the spec for full details.

---

## Git Setup Notes

`.gitignore` tracks PDFs in `public/` (needed for deployment) but ignores intermediate PDFs in `print-sources/`. The `node_modules/` and `*.zip` files are also ignored.
