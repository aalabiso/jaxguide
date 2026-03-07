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
├── jacksonville-guide-print.html      ← Print source HTML (17 pages, 8.5x11in layout)
├── jacksonville-guide-web.html        ← Original single-file web version (reference copy)
├── images/                            ← Source images used by print HTML
│   ├── spiritualized-life-hurricane-irma.jpg
│   ├── southbank-riverwalk.jpg
│   ├── jaguars-everbank-stadium.png
│   ├── jumbo-shrimp-vystar-ballpark.png
│   ├── icemen-hockey-arena.webp
│   ├── tpc-sawgrass-17th-hole.jpg
│   ├── florida-theatre.jpg
│   ├── cummer-museum-gardens.jpg
│   ├── jacksonville-aerial-st-johns-river.jpg
│   ├── jacksonville-zoo-gardens.avif
│   ├── jacksonville arboretum.jpg
│   └── jacksonville jumbo shrimp game.png
├── public/                            ← WEB DEPLOYMENT ROOT — deploy this folder
│   ├── index.html                     ← Responsive web guide (references assets/)
│   ├── Jacksonville-Guide.pdf         ← Downloadable print PDF
│   └── assets/
│       ├── css/style.css              ← Extracted stylesheet
│       ├── js/main.js                 ← Scroll animations, back-to-top, nav behavior
│       ├── images/                    ← Copy of all images for web version
│       └── fonts/                     ← Empty (using Google Fonts CDN)
├── scripts/
│   ├── generate-print-pdf.js          ← Puppeteer script: print HTML → PDF
│   └── generate-march-pdf.js          ← Puppeteer script: monthly events HTML → PDF
├── monthly-events/
│   ├── march-events.html              ← March 2026 events (2-page print layout)
│   └── Jacksonville-March-2026-Events.pdf
├── docs/
│   └── PRODUCT-SPEC-Stadius.md        ← Full product spec for the Stadius SaaS app
├── package.json                       ← Node deps (puppeteer-core)
├── package-lock.json
└── node_modules/
```

---

## How Things Work

### Print PDF Generation

The print guide is a single HTML file (`jacksonville-guide-print.html`) with 17 `<div>` elements, each exactly 8.5in × 11in with `overflow: hidden` and `page-break-after: always`. Puppeteer renders this to a pixel-perfect PDF.

**To regenerate the PDF after editing the print HTML:**
```powershell
cd D:\projects\jaxguide
node scripts/generate-print-pdf.js
```

Output goes to `public/Jacksonville-Guide.pdf`. The script uses `puppeteer-core` with the system Chrome installation at `C:\Program Files\Google\Chrome\Application\chrome.exe`.

**Key print HTML constraints:**
- Each page div must not exceed 11in height — content that overflows is clipped (invisible in PDF)
- `@page { size: 8.5in 11in; margin: 0; }` — zero-margin letter size
- Padding is handled per-page: `padding: 0.5in 0.6in`
- Images use relative paths to the `images/` folder (same directory level as the HTML)
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

The original single-file version (`jacksonville-guide-web.html` in root) is kept as a reference but is NOT what gets deployed.

### Monthly Events

Monthly events are standalone 2-page print PDFs. Each month gets its own HTML file in `monthly-events/`.

**To generate a monthly events PDF:**
```powershell
cd D:\projects\jaxguide
node scripts/generate-march-pdf.js
```

**To create a new month:** Duplicate `monthly-events/march-events.html`, update the content with that month's events, and create a corresponding `scripts/generate-{month}-pdf.js` (or make the script accept a month parameter).

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
1. Open `jacksonville-guide-print.html`
2. Find the relevant section (search for the page comment, e.g., `<!-- PAGE 9: MORE RESTAURANTS -->`)
3. Copy an existing card block and modify the content
4. **Watch page height** — if adding cards pushes content past 11in, it will be clipped in the PDF. Either remove a card or move content to a new page.
5. Regenerate PDF: `node scripts/generate-print-pdf.js`
6. Update the web version (`public/index.html`) with the same content change

### Update the web version after print changes
The web version (`public/index.html`) and print version (`jacksonville-guide-print.html`) have the same content but different HTML structure. Changes to one do NOT automatically propagate to the other. After editing print content, manually update the corresponding section in `public/index.html`.

### Add a new monthly events page
1. Copy `monthly-events/march-events.html` as a template
2. Update the month name, event cards, dates, and descriptions
3. Create a new script or modify the existing one to point to the new HTML file
4. Generate: `node scripts/generate-{month}-pdf.js`

### Add new images
1. Place the image file in `images/` (for print HTML) AND `public/assets/images/` (for web)
2. Reference in print HTML as `src="images/filename.jpg"`
3. Reference in web HTML as `src="assets/images/filename.jpg"`
4. Recommended: use JPG for photos, PNG for graphics with transparency, WebP for modern optimization

### Deploy the web version
The `public/` folder is a fully self-contained static site. Deploy it to any static host:
- **Netlify/Vercel/Cloudflare Pages:** Point to the `public/` directory
- **GitHub Pages:** Set the source to the `public/` folder
- **S3/Spaces:** Upload the entire `public/` folder contents

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

Recommended `.gitignore`:
```
node_modules/
*.pdf
```

PDFs are generated artifacts — no need to version them. The HTML source files are what matter. Images should be committed since they're part of the content.
