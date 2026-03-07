# Stadius — Product Specification
## A Guidebook Builder for Short-Term Rental Hosts

**Version:** 1.0 (V1 MVP)
**Author:** Alex + Claude Product Sprint
**Date:** March 2026
**Purpose:** Execution-ready specification for Claude Code autonomous build

---

## 1. Project Overview

### What We're Building
Stadius is a web application that lets Airbnb/VRBO hosts create beautiful, print-ready destination guidebooks for their guests. Users build pages using a block-based editor (content cards, hero images, trivia, tips, stats bars, etc.), then export as a pixel-perfect letter-size PDF and/or a responsive web version. A QR code bridges print to web — guests scan it on the printed guide to access the living, updateable web version.

### Target User
Solo short-term rental host. Moderately tech-savvy (can use Canva, knows their way around a web app). NOT a developer. Wants their guidebook to look professionally designed without hiring a designer or writing code.

### Core Value Proposition
"Create a destination guidebook that looks like a design agency made it — in 30 minutes, not 30 hours."

### Success Criteria (V1 "Done")
1. A user can sign up, create a guidebook, add pages with blocks, and export a print-ready letter-size PDF
2. A shareable web version is auto-generated with a unique URL
3. A QR code is generated that links to the web version
4. The PDF output quality matches or exceeds the Jacksonville proof-of-concept guide
5. The entire flow works without any coding knowledge

### Revenue Model
- **One-time purchase** ($29-49): Create and export a single guidebook (PDF + web + QR)
- **Pro subscription** ($9.99/mo): Unlimited guidebooks, monthly event page templates, custom domain for web version, QR code hosting, analytics (how many scans), priority AI content suggestions
- Free tier: 1 guidebook, 5 pages max, watermarked PDF (for trial/conversion)

---

## 2. Tech Stack & Architecture

### Why Laravel + PHP
- Alex has deep Laravel expertise — fastest path to production
- Laravel handles CMS/CRUD beautifully with Eloquent ORM, form requests, policies
- Blade templating maps naturally to rendering guidebook pages as HTML (same approach as the proof-of-concept)
- Laravel Queues handle async PDF generation without blocking the UI
- Built-in auth (Breeze/Jetstream), file storage (S3), billing (Cashier/Stripe)
- Inertia.js + Vue 3 gives SPA-like editor experience without a separate API layer

### Stack Decision

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | Laravel 12 (PHP 8.5) | CMS, auth, API, queue processing, billing |
| **Frontend** | Vue 3 + Inertia.js | Reactive editor UI without separate API; SSR-capable |
| **Editor UI** | Vue 3 components + Tailwind CSS 4 | Drag-and-drop block editor with live preview |
| **Database** | MySQL 8.4 | Reliable, well-supported by Laravel; JSON columns for flexible block data |
| **PDF Generation** | Browsershot (Puppeteer wrapper for Laravel) | Proven approach — identical to the Jax guide pipeline |
| **Web Version** | Blade templates rendered as static HTML | Same rendering pipeline as PDF, responsive variant |
| **QR Codes** | `simplesoftwareio/simple-qrcode` (Laravel package) | Generates SVG/PNG QR codes server-side |
| **AI Content** | Anthropic API (Claude) — default; swappable via config | Content suggestions for cards, trivia, descriptions |
| **File Storage** | S3-compatible (AWS S3 or DigitalOcean Spaces) | User images, generated PDFs, web version assets |
| **Cache** | Redis | Session management, queue backend, block template caching |
| **Search** | Meilisearch (via Laravel Scout) | AI content search (restaurants, landmarks, etc.) |
| **Payments** | Stripe via Laravel Cashier | One-time purchases + subscriptions |

### Key Architecture Decisions

**Why Inertia.js instead of a separate Vue SPA + API:**
Inertia gives SPA-like navigation and reactivity while keeping server-side routing, middleware, and session auth. No need to build and maintain a separate REST/GraphQL API. The editor needs real-time reactivity (drag-drop, live preview), but everything else (auth, billing, settings) is standard CRUD — Inertia handles both elegantly.

**Why Browsershot for PDF (not DomPDF or wkhtmltopdf):**
DomPDF can't handle complex CSS (gradients, flexbox, grid, web fonts). wkhtmltopdf is deprecated. Browsershot wraps Puppeteer and renders via headless Chrome — identical to our proof-of-concept pipeline. It handles everything: web fonts, gradients, `@page` rules, `overflow: hidden`, `page-break-after`. The Jax guide proves this approach produces professional output.

**Why MySQL 8.4 (not PostgreSQL/SQLite):**
Alex has deep MySQL experience from Laravel projects. MySQL 8.x has solid JSON column support with `JSON_EXTRACT()` and generated virtual columns for indexing into JSON data. Each block stores its content as a JSON column (title, description, emoji, color, url, etc.). For V1 query complexity, MySQL's JSON support is more than sufficient. SQLite lacks concurrent write handling needed for queue workers + web requests.

---

## 3. Data Model

### Entity Relationship

```
User
  └── has many Guidebooks
        ├── has one GuidebookSettings (colors, fonts, meta)
        ├── has many Pages (ordered)
        │     └── has many Blocks (ordered within page)
        └── has many Exports (PDF files, web deploys)

Block Templates (global, seeded)
  └── defines available block types and their schemas

AI Content Cache
  └── stores location-based content suggestions
```

### Database Schema

#### `users`
Standard Laravel auth table + Cashier billing columns.
```
id, name, email, password, stripe_id, pm_type, pm_last_four, trial_ends_at,
created_at, updated_at
```

#### `guidebooks`
```
id                  UUID, primary key
user_id             FK → users
title               string (e.g., "Jacksonville Guest Guide")
subtitle            string, nullable (e.g., "Your Local Adventure Starts Here")
destination_city    string (e.g., "Jacksonville")
destination_state   string (e.g., "FL")
slug                string, unique (for web version URL: stadius.com/g/{slug})
cover_image_path    string, nullable (S3 path)
status              enum: draft, published
qr_code_path        string, nullable (S3 path to generated QR PNG/SVG)
web_version_url     string, nullable (generated on publish)
color_scheme        JSON (primary, secondary, accent, background colors)
font_scheme         JSON (heading_font, body_font, accent_font)
created_at, updated_at
```

#### `pages`
```
id                  UUID, primary key
guidebook_id        FK → guidebooks
title               string (e.g., "Neighborhoods & History")
page_type           enum: cover, section_intro, content, credits
background_style    string (e.g., "page-cream", "page-dark-teal")
sort_order          integer
created_at, updated_at
```

#### `blocks`
```
id                  UUID, primary key
page_id             FK → pages
block_type          string (e.g., "card", "hero_image", "trivia_box", "stats_bar",
                    "fun_fact", "highlight_strip", "section_header", "card_grid",
                    "featured_image", "tip_box", "event_card", "split_feature")
content             JSON (block-type-specific payload — see Block Schemas below)
sort_order          integer
grid_column_span    integer, default 1 (1 = half width in 2-col grid, 2 = full width)
created_at, updated_at
```

#### `block_templates`
```
id                  UUID, primary key
block_type          string
label               string (human-readable name, e.g., "Content Card")
description         string (what it's for)
icon                string (emoji)
default_content     JSON (pre-filled example content)
schema              JSON (field definitions: name, type, required, placeholder)
category            string (e.g., "content", "media", "data", "decoration")
created_at, updated_at
```

#### `exports`
```
id                  UUID, primary key
guidebook_id        FK → guidebooks
export_type         enum: pdf, web
file_path           string, nullable (S3 path for PDF)
file_size_bytes     integer, nullable
status              enum: queued, processing, completed, failed
error_message       text, nullable
created_at, updated_at
```

#### `ai_content_cache`
```
id                  UUID, primary key
city                string
state               string
content_type        string (e.g., "restaurants", "landmarks", "activities")
content             JSON (array of suggested items)
fetched_at          timestamp
expires_at          timestamp
```

### Block Content Schemas (JSONB payloads)

Each block type has a defined JSON structure stored in the `content` column:

**card**
```json
{
  "emoji": "🍔",
  "title": "M Shack",
  "subtitle": "Gourmet Burgers",
  "description": "Locally sourced, hand-crafted burgers with creative toppings.",
  "highlight": "Try the Jax Burger",
  "color_accent": "#E8722A"
}
```

**hero_image**
```json
{
  "image_path": "uploads/beaches-hero.jpg",
  "alt_text": "Jacksonville Beach at sunset",
  "height_px": 300,
  "overlay_text": null,
  "border_radius": "12px"
}
```

**trivia_box**
```json
{
  "title": "Did You Know?",
  "emoji": "🧠",
  "text": "Jacksonville is the largest city by area in the contiguous United States at 875 square miles.",
  "background_color": "#D4EDF0"
}
```

**stats_bar**
```json
{
  "stats": [
    { "value": "22", "unit": "miles", "label": "of beaches" },
    { "value": "80K+", "unit": "acres", "label": "of parks" },
    { "value": "260+", "unit": "days", "label": "of sunshine" }
  ]
}
```

**fun_fact**
```json
{
  "emoji": "🌴",
  "text": "The St. Johns is one of the few rivers in North America that flows north!",
  "style": "inline"
}
```

**highlight_strip**
```json
{
  "emoji": "🎵",
  "title": "Music City Roots",
  "text": "Lynyrd Skynyrd, Limp Bizkit, and Yellowcard all started here.",
  "background_color": "#1A4B6E"
}
```

**section_header**
```json
{
  "icon": "🏖️",
  "label": "SECTION TWO",
  "title": "Beaches & Waterfront",
  "intro_text": "From the bustling Jacksonville Beach boardwalk..."
}
```

**tip_box**
```json
{
  "emoji": "💡",
  "title": "Pro Tip",
  "text": "Visit the beach at low tide for the widest sand — check tides at surfline.com.",
  "style": "accent"
}
```

**featured_image**
```json
{
  "image_path": "uploads/downtown-mural.jpg",
  "caption": "The famous 'Jax Strong' mural in Springfield",
  "height_px": 180
}
```

**split_feature**
```json
{
  "image_path": "uploads/food-scene.jpg",
  "title": "A Food Scene on the Rise",
  "text": "Jacksonville's culinary landscape has exploded...",
  "image_side": "left"
}
```

---

## 4. Core Features & User Journey

### 4.1 Onboarding Flow

1. **Sign up** (email + password via Laravel Breeze, or Google OAuth)
2. **"Create Your First Guidebook"** — prominent CTA on empty dashboard
3. **Destination Setup Wizard** (3 steps):
   - Step 1: Enter city + state (e.g., "Jacksonville, FL")
   - Step 2: Choose a color scheme from 6 presets (Coastal Teal, Desert Sand, Mountain Green, Urban Charcoal, Sunset Orange, Classic Navy) OR customize with color pickers
   - Step 3: Choose a font pairing from 4 presets (Elegant: Playfair + Nunito, Modern: Inter + DM Sans, Bold: Montserrat + Open Sans, Classic: Merriweather + Source Sans)
4. **AI Content Boost** (optional): "Want us to suggest popular spots in Jacksonville? We'll find top restaurants, landmarks, and activities to get you started." → Runs AI content fetch in background, pre-populates a suggestion panel.

### 4.2 Page Editor (Core Product)

The editor is the heart of the application. It must feel intuitive, responsive, and WYSIWYG-ish.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Toolbar: [+ Add Page] [Undo] [Redo] [Preview] [Export] │
├──────────┬──────────────────────────┬───────────────┤
│          │                          │               │
│  Page    │    Canvas / Editor       │   Block       │
│  List    │    (8.5 x 11 preview)    │   Properties  │
│  (left)  │                          │   (right)     │
│          │                          │               │
│  pg 1 ◀  │   ┌──────────────────┐   │  Title: ___   │
│  pg 2    │   │                  │   │  Emoji: ___   │
│  pg 3    │   │   Live preview   │   │  Color: ___   │
│  pg 4    │   │   of current     │   │  Desc: ___    │
│  ...     │   │   page at ~60%   │   │               │
│          │   │   scale          │   │  [Delete Block]│
│ [+ Page] │   │                  │   │               │
│          │   └──────────────────┘   │               │
├──────────┴──────────────────────────┴───────────────┤
│  Block Palette: [Card] [Hero] [Trivia] [Stats] ...  │
└─────────────────────────────────────────────────────┘
```

**Page List (Left Sidebar):**
- Vertical list of page thumbnails (small)
- Click to switch active page
- Drag to reorder pages
- Right-click context menu: Duplicate, Delete, Change Background
- "+" button to add a new page (choose: blank, section intro template, content grid template)

**Canvas (Center):**
- Shows the current page at approximately 60% scale in a letter-size frame
- Blocks are rendered in their actual positions
- Click a block to select it (blue outline)
- Drag blocks to reorder within the page (vertical sort order)
- Double-click a block to edit inline (or use right panel)
- Visual page boundary indicator — orange warning line near the bottom if content is approaching overflow
- "Page full" indicator if blocks exceed the page height

**Block Properties (Right Panel):**
- When a block is selected, shows editable fields based on block type schema
- Text inputs, color pickers, image upload dropzone, emoji picker
- "Move to next page" button if block doesn't fit
- Block-specific settings (e.g., card color accent, image height, stat values)

**Block Palette (Bottom):**
- Horizontal scrollable row of available block types
- Each shown as icon + label: 📇 Card, 🖼️ Hero Image, 🧠 Trivia, 📊 Stats Bar, 💡 Tip, ⭐ Fun Fact, 🎨 Highlight Strip, 📸 Featured Image, 📝 Section Header
- Click or drag onto canvas to add to current page

### 4.3 AI Content Assistant

**Provider Architecture:**
- Default provider: Anthropic (Claude Sonnet) via `anthropic` PHP SDK
- AI logic abstracted behind an `AiProvider` interface with a `generate(string $prompt): string` method
- `config/ai.php` stores: `default_provider`, `providers.anthropic.api_key`, `providers.openai.api_key`
- V1 ships with Anthropic only. Architecture supports adding OpenAI, or user-supplied BYOK keys in V2.

**How it works:**
- User enters their destination city during setup
- System calls AI API with prompt: "Suggest the top 10 [restaurants/landmarks/activities/breweries/parks] in {city}, {state}. For each, provide: name, one-line description (under 15 words), an emoji that represents it, and a short highlight/pro-tip (under 10 words)."
- Results cached in `ai_content_cache` table (expires after 30 days)
- Shown in a collapsible "Suggestions" panel in the editor
- User clicks "Add to page" on any suggestion → creates a pre-filled Card block

**Content categories:**
- Restaurants & Food
- Bars & Breweries
- Outdoor Activities
- Landmarks & History
- Beaches & Waterfront (if coastal city)
- Arts & Culture
- Shopping
- Family & Kids
- Nightlife
- Day Trips

**AI also helps with:**
- "Write a trivia question about {city}" → generates Trivia Box content
- "Write a fun fact about {city}" → generates Fun Fact content
- "Write a section intro for {topic} in {city}" → generates Section Header intro text

### 4.4 PDF Export Pipeline

This is the core technical feature and must produce output matching the Jax guide quality.

**Process:**
1. User clicks "Export PDF" button
2. System dispatches `GeneratePdfJob` to Laravel Queue (Redis-backed)
3. Job renders the guidebook as a single HTML document using Blade template (`guidebook-print.blade.php`)
4. Blade template outputs the same page system as the Jax proof-of-concept:
   - Each page: `<div class="page {background_style}">` with `width: 8.5in; height: 11in; overflow: hidden; page-break-after: always`
   - Blocks rendered in sort order using Blade `@include` partials per block type
   - CSS includes all the design system styles (card grids, typography, colors)
   - Google Fonts loaded via `<link>` tags
   - Color scheme and font scheme from guidebook settings injected as CSS custom properties
5. Browsershot (Puppeteer) converts HTML → PDF:
   ```php
   Browsershot::html($html)
       ->format('Letter')
       ->margins(0, 0, 0, 0)
       ->showBackground()
       ->waitUntilNetworkIdle()
       ->save($pdfPath);
   ```
6. PDF uploaded to S3, export record updated with path + file size
7. User receives notification (via Inertia event or polling) that PDF is ready
8. User downloads PDF from their dashboard

**PDF Blade Template Structure:**
The template iterates over pages and blocks, rendering each with the appropriate partial:
```blade
@foreach($guidebook->pages as $page)
  <div class="page {{ $page->background_style }}">
    @foreach($page->blocks as $block)
      @include("blocks.print.{$block->block_type}", ['block' => $block])
    @endforeach
  </div>
@endforeach
```

Each block partial (e.g., `blocks/print/card.blade.php`) renders the HTML for that block type using the `$block->content` JSON data.

### 4.5 Web Version

**When user clicks "Publish Web Version":**
1. System renders guidebook using `guidebook-web.blade.php` template
   - Responsive layout (not fixed 8.5x11 — adapts to screen width)
   - Cards stack vertically on mobile, 2-col on tablet, maintain grid on desktop
   - Section intros become full-width hero banners
   - Same content, different CSS optimized for screen reading
2. Output hosted at `stadius.com/g/{guidebook-slug}`
3. Blade page served dynamically (cached with Laravel page cache for performance)
4. Meta tags for social sharing (OG image from cover, title, description)

### 4.6 QR Code Generation

**Automatic on publish:**
1. When web version URL is generated, system creates QR code:
   ```php
   QrCode::format('svg')
       ->size(300)
       ->margin(1)
       ->generate($guidebook->web_version_url);
   ```
2. QR code stored as SVG on S3
3. QR code automatically inserted on the PDF's back/credits page
4. Also available as standalone download (PNG + SVG) for the user to place wherever they want (business cards, fridge magnets, welcome letter, etc.)

---

## 5. Design System

### Foundational Styles (from Jax Proof-of-Concept)

The CSS design system is the product's moat. It's what makes guides look professional without design skill.

**Page System:**
```css
.page {
  width: 8.5in;
  height: 11in;
  padding: 0.5in 0.6in;
  position: relative;
  overflow: hidden;
  page-break-after: always;
}
```

**Color Scheme Presets (6):**

| Preset | Primary | Secondary | Accent | Background |
|--------|---------|-----------|--------|------------|
| Coastal Teal | #007B8A | #1A4B6E | #E8722A | #FEFDFB |
| Desert Sand | #C08B3E | #5C3D2E | #D94F30 | #FAF3E6 |
| Mountain Green | #2D7D46 | #1A4B6E | #D4A43A | #F0F7F2 |
| Urban Charcoal | #1C2B35 | #5C6670 | #E84E4E | #F5F5F5 |
| Sunset Orange | #E8722A | #1A4B6E | #C8922A | #FFF8F0 |
| Classic Navy | #1A3A5C | #5C6670 | #C8922A | #FAFBFD |

**Font Pairing Presets (4):**

| Preset | Heading | Body | Accent |
|--------|---------|------|--------|
| Elegant | Playfair Display | Nunito | Bebas Neue |
| Modern | Inter | DM Sans | Space Grotesk |
| Bold | Montserrat | Open Sans | Oswald |
| Classic | Merriweather | Source Sans 3 | Lora |

**Block CSS:**
All block styles from the Jax guide carry over: `.card`, `.card-grid-2`, `.card-grid-3`, `.trivia-box`, `.fun-fact`, `.stats-bar`, `.highlight-strip`, `.featured-image`, `.tip-box`, `.section-header`. These are parameterized via CSS custom properties so color/font schemes apply automatically.

---

## 6. File Structure

```
stadius/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── DashboardController.php
│   │   │   ├── GuidebookController.php       # CRUD + publish
│   │   │   ├── PageController.php             # Page CRUD + reorder
│   │   │   ├── BlockController.php            # Block CRUD + reorder
│   │   │   ├── ExportController.php           # PDF + web export triggers
│   │   │   ├── AiContentController.php        # AI suggestion endpoints
│   │   │   └── BillingController.php          # Stripe/Cashier
│   │   ├── Requests/
│   │   │   ├── StoreGuidebookRequest.php
│   │   │   ├── UpdateBlockRequest.php
│   │   │   └── ...
│   │   └── Middleware/
│   │       └── EnsureGuidebookOwner.php       # Authorization
│   ├── Models/
│   │   ├── User.php
│   │   ├── Guidebook.php
│   │   ├── Page.php
│   │   ├── Block.php
│   │   ├── BlockTemplate.php
│   │   ├── Export.php
│   │   └── AiContentCache.php
│   ├── Jobs/
│   │   ├── GeneratePdfJob.php                 # Async PDF via Browsershot
│   │   └── FetchAiContentJob.php              # Async AI content suggestions
│   ├── Services/
│   │   ├── PdfRenderer.php                    # HTML assembly + Browsershot
│   │   ├── WebVersionRenderer.php             # Web HTML generation
│   │   ├── QrCodeService.php                  # QR code generation
│   │   ├── AiContentService.php               # AI API integration
│   │   └── BlockSchemaService.php             # Block type validation
│   └── Policies/
│       ├── GuidebookPolicy.php
│       └── PagePolicy.php
├── resources/
│   ├── js/
│   │   ├── app.js                             # Inertia + Vue bootstrap
│   │   ├── Pages/
│   │   │   ├── Dashboard.vue
│   │   │   ├── Guidebook/
│   │   │   │   ├── Create.vue                 # Setup wizard
│   │   │   │   ├── Editor.vue                 # Main page editor
│   │   │   │   ├── Settings.vue               # Color/font/meta
│   │   │   │   └── Exports.vue                # Download PDFs
│   │   │   └── Billing/
│   │   │       └── Index.vue
│   │   ├── Components/
│   │   │   ├── Editor/
│   │   │   │   ├── PageList.vue               # Left sidebar
│   │   │   │   ├── Canvas.vue                 # Center preview
│   │   │   │   ├── BlockProperties.vue        # Right panel
│   │   │   │   ├── BlockPalette.vue           # Bottom bar
│   │   │   │   ├── BlockRenderer.vue          # Renders block preview
│   │   │   │   └── AiSuggestionsPanel.vue     # Collapsible AI panel
│   │   │   ├── Blocks/
│   │   │   │   ├── CardBlock.vue
│   │   │   │   ├── HeroImageBlock.vue
│   │   │   │   ├── TriviaBoxBlock.vue
│   │   │   │   ├── StatsBarBlock.vue
│   │   │   │   ├── FunFactBlock.vue
│   │   │   │   ├── HighlightStripBlock.vue
│   │   │   │   ├── TipBoxBlock.vue
│   │   │   │   ├── FeaturedImageBlock.vue
│   │   │   │   ├── SectionHeaderBlock.vue
│   │   │   │   └── SplitFeatureBlock.vue
│   │   │   └── Shared/
│   │   │       ├── ColorPicker.vue
│   │   │       ├── EmojiPicker.vue
│   │   │       ├── ImageUpload.vue
│   │   │       └── DraggableList.vue
│   │   └── Composables/
│   │       ├── useEditor.js                   # Editor state management
│   │       ├── useBlocks.js                   # Block CRUD operations
│   │       └── useAutoSave.js                 # Debounced auto-save
│   └── views/
│       ├── guidebook/
│       │   ├── print.blade.php                # Full print HTML template
│       │   ├── web.blade.php                  # Responsive web template
│       │   └── blocks/
│       │       ├── print/                     # Print block partials
│       │       │   ├── card.blade.php
│       │       │   ├── hero_image.blade.php
│       │       │   ├── trivia_box.blade.php
│       │       │   ├── stats_bar.blade.php
│       │       │   ├── fun_fact.blade.php
│       │       │   ├── highlight_strip.blade.php
│       │       │   ├── tip_box.blade.php
│       │       │   ├── featured_image.blade.php
│       │       │   ├── section_header.blade.php
│       │       │   └── split_feature.blade.php
│       │       └── web/                       # Web-responsive partials
│       │           └── (same files, responsive CSS)
│       └── emails/
│           ├── export-ready.blade.php
│           └── welcome.blade.php
├── database/
│   ├── migrations/
│   │   ├── create_guidebooks_table.php
│   │   ├── create_pages_table.php
│   │   ├── create_blocks_table.php
│   │   ├── create_block_templates_table.php
│   │   ├── create_exports_table.php
│   │   └── create_ai_content_cache_table.php
│   └── seeders/
│       ├── BlockTemplateSeeder.php            # Seeds all block type definitions
│       └── DemoGuidebookSeeder.php            # Seeds the Jax guide as demo
├── routes/
│   ├── web.php                                # Inertia page routes
│   └── api.php                                # Block CRUD, AI suggestions, export triggers
├── config/
│   ├── guidebook.php                          # Color presets, font presets, block limits
│   └── services.php                           # AI API keys, S3, Stripe
├── public/
│   └── fonts/                                 # Self-hosted Google Fonts for PDF rendering
├── tests/
│   ├── Feature/
│   │   ├── GuidebookTest.php
│   │   ├── PageEditorTest.php
│   │   ├── PdfExportTest.php
│   │   └── AiContentTest.php
│   └── Unit/
│       ├── BlockSchemaTest.php
│       └── PdfRendererTest.php
└── .env.example
```

---

## 7. API Routes

### Guidebook CRUD
```
GET    /dashboard                          → DashboardController@index
POST   /guidebooks                         → GuidebookController@store
GET    /guidebooks/{guidebook}/edit         → GuidebookController@edit (→ Editor.vue)
PUT    /guidebooks/{guidebook}              → GuidebookController@update
DELETE /guidebooks/{guidebook}              → GuidebookController@destroy
POST   /guidebooks/{guidebook}/publish      → GuidebookController@publish
```

### Page Management
```
POST   /api/guidebooks/{guidebook}/pages              → PageController@store
PUT    /api/guidebooks/{guidebook}/pages/{page}        → PageController@update
DELETE /api/guidebooks/{guidebook}/pages/{page}        → PageController@destroy
POST   /api/guidebooks/{guidebook}/pages/reorder       → PageController@reorder
```

### Block Management
```
POST   /api/pages/{page}/blocks                        → BlockController@store
PUT    /api/blocks/{block}                              → BlockController@update
DELETE /api/blocks/{block}                              → BlockController@destroy
POST   /api/pages/{page}/blocks/reorder                → BlockController@reorder
```

### Exports
```
POST   /api/guidebooks/{guidebook}/export/pdf           → ExportController@pdf
POST   /api/guidebooks/{guidebook}/export/web           → ExportController@web
GET    /api/exports/{export}/status                     → ExportController@status
GET    /api/exports/{export}/download                   → ExportController@download
```

### AI Content
```
POST   /api/guidebooks/{guidebook}/ai/suggestions       → AiContentController@suggest
POST   /api/guidebooks/{guidebook}/ai/generate-block    → AiContentController@generateBlock
```

### Public Web Version
```
GET    /g/{slug}                            → Public guidebook web view (cached)
```

---

## 8. Implementation Phases (Build Order)

Each phase is scoped as a single Claude Code session. Feed the full spec as context, then tell Claude Code which phase to execute. Phases are sequential — each depends on the previous.

---

### Session 1: Foundation + Data Layer
**Estimated time:** 1-2 hours
**Feed to Claude Code:** Full spec + "Execute Session 1"

1. `laravel new stadius` with Breeze + Vue + Inertia starter kit
2. Configure `.env` for MySQL + Redis via Herd Pro (localhost defaults)
3. Create all migrations: `guidebooks`, `pages`, `blocks`, `block_templates`, `exports`, `ai_content_cache`
4. Create all Eloquent models with relationships, casts (JSON columns), and UUID traits
5. Seed `BlockTemplateSeeder` with all 10 block type definitions (card, hero_image, trivia_box, stats_bar, fun_fact, highlight_strip, section_header, tip_box, featured_image, split_feature) — include schemas and default content
6. Create `GuidebookController` with full CRUD + `StoreGuidebookRequest` validation
7. Create `PageController` and `BlockController` with CRUD + reorder endpoints
8. Create `EnsureGuidebookOwner` middleware and `GuidebookPolicy`
9. Build Dashboard.vue: list guidebooks, "Create New Guide" button
10. Build Guidebook/Create.vue: 3-step setup wizard (city/state → color scheme picker → font pairing picker)
11. Wire up all routes (web.php + api.php) per Section 7
12. Run migrations, seed, verify CRUD works end-to-end in browser

**Done when:** User can register, create a guidebook with city/colors/fonts, see it on dashboard, and it persists to MySQL.

---

### Session 2: Page Editor (Core UI)
**Estimated time:** 2-3 hours
**Feed to Claude Code:** Full spec + "Execute Session 2" + confirm Session 1 is complete

1. Build Editor.vue with three-panel layout (PageList left, Canvas center, BlockProperties right, BlockPalette bottom)
2. PageList.vue: vertical page thumbnails, click to switch, drag to reorder (vuedraggable or vue-sortable), add/delete pages, right-click context menu for duplicate/delete/change background
3. Canvas.vue: render current page as 8.5×11 preview at ~60% scale, blocks rendered in sort order, click to select (blue outline), drag to reorder within page
4. BlockPalette.vue: horizontal row of block types with emoji + label, click to add to current page
5. BlockProperties.vue: dynamic form generated from block template schema — text inputs, color pickers, emoji picker, textarea for descriptions
6. Build all 10 Block Vue components in `Components/Blocks/`: CardBlock.vue, HeroImageBlock.vue, TriviaBoxBlock.vue, StatsBarBlock.vue, FunFactBlock.vue, HighlightStripBlock.vue, TipBoxBlock.vue, FeaturedImageBlock.vue, SectionHeaderBlock.vue, SplitFeatureBlock.vue
7. `useEditor.js` composable: manages active page, selected block, undo state
8. `useBlocks.js` composable: block CRUD via Inertia requests to API
9. `useAutoSave.js` composable: debounced PUT to save block content changes (500ms debounce)
10. Page height estimation: sum block estimated heights per Section 10.1, show green/yellow/red fill indicator on Canvas
11. Image upload: dropzone component that uploads to local storage (S3 config can come later), stores path in block content

**Done when:** User can open the editor, add pages, drag blocks from palette onto pages, edit block content in the properties panel, reorder blocks, and all changes auto-save.

---

### Session 3: PDF Export + Design System
**Estimated time:** 2-3 hours
**Feed to Claude Code:** Full spec + "Execute Session 3" + confirm Sessions 1-2 are complete

1. Download and self-host Google Fonts `.woff2` files in `public/fonts/` for all 4 font presets (Playfair Display, Nunito, Bebas Neue, Merriweather, Inter, DM Sans, Space Grotesk, Montserrat, Open Sans, Oswald, Source Sans 3, Lora)
2. Build `resources/views/guidebook/print.blade.php`: the master print template that iterates pages → blocks, outputting the full page system CSS (from Jax proof-of-concept Section 5) with dynamic color/font scheme via CSS custom properties
3. Build all 10 print block Blade partials in `resources/views/guidebook/blocks/print/`: card.blade.php, hero_image.blade.php, trivia_box.blade.php, etc. — each renders its block type using `$block->content` JSON
4. Build cover page partial: full-page background image + gradient overlay + centered title/subtitle/tagline (per Section 10.5)
5. Install Browsershot: `composer require spatie/browsershot` + ensure Puppeteer/Chrome accessible via Herd
6. Build `PdfRenderer` service: loads guidebook with pages+blocks, renders print.blade.php to HTML string, downloads any S3/storage images to temp dir (per Section 10.4), calls Browsershot with Letter format + zero margins + background printing
7. Build `GeneratePdfJob`: queued job that runs PdfRenderer, saves PDF to storage, updates `exports` table with path + file size + status
8. Build `ExportController`: `pdf()` dispatches job + returns export ID, `status()` returns current status, `download()` streams file
9. Build Exports.vue: "Generate PDF" button, progress indicator (polls status every 2s), download link when complete
10. **Test with real content**: create a guidebook, add blocks matching the Jax guide, export PDF, verify it matches proof-of-concept quality

**Done when:** User can build a guidebook in the editor, click "Export PDF," and download a professional letter-size PDF that matches the Jax guide design quality.

---

### Session 4: Web Version + QR Code
**Estimated time:** 1-2 hours
**Feed to Claude Code:** Full spec + "Execute Session 4" + confirm Sessions 1-3 are complete

1. Build `resources/views/guidebook/web.blade.php`: responsive version — same blocks, different CSS (cards stack on mobile, 2-col on tablet, hero images become full-width banners)
2. Build all 10 web block Blade partials in `resources/views/guidebook/blocks/web/` — responsive variants of the print partials
3. Build `WebVersionRenderer` service: renders web.blade.php with guidebook data, caches output
4. Public route `GET /g/{slug}` — serves web version with OG meta tags (title, description, cover image)
5. Install QR code package: `composer require simplesoftwareio/simple-qrcode`
6. Build `QrCodeService`: generates SVG + PNG QR codes pointing to `{APP_URL}/g/{slug}`, stores to storage
7. Auto-generate QR code when guidebook is published
8. Add QR code to the credits/back page of the print PDF template
9. Add QR code standalone download (SVG + PNG) on the guidebook exports page
10. Add "Publish" button on editor that generates web version + QR code

**Done when:** User can publish a guidebook, get a shareable web URL, see the responsive web version, and download the QR code. PDF includes the QR code on the back page.

---

### Session 5: AI Content + Polish
**Estimated time:** 2-3 hours
**Feed to Claude Code:** Full spec + "Execute Session 5" + confirm Sessions 1-4 are complete

1. Install Anthropic PHP SDK: `composer require anthropic-ai/laravel`
2. Create `config/ai.php` with provider architecture (default: anthropic, interface-based for future swappability)
3. Build `AiContentService` implementing `AiProvider` interface — calls Claude Sonnet with structured prompts for content suggestions by category
4. Build `FetchAiContentJob`: queued job that fetches AI suggestions for a city across all content categories, stores in `ai_content_cache`
5. Build `AiContentController`: `suggest()` returns cached suggestions or triggers fetch, `generateBlock()` generates single trivia/fun fact/intro on demand
6. Build `AiSuggestionsPanel.vue`: collapsible side panel in the editor, grouped by category, "Add to page" button on each suggestion
7. "Generate trivia" and "Generate fun fact" quick-action buttons in block palette
8. Rate limiting: `throttle:20,60` on AI routes (per Section 10.6)
9. Wire up AI suggestion fetch during guidebook creation wizard (Step 3 optional "boost")
10. Polish pass: loading states on all async operations, empty states for dashboard/pages/blocks, error toasts for failed saves/exports, confirm dialogs for destructive actions (delete page, delete guidebook)
11. Mobile-responsive navigation for dashboard and settings pages (editor itself is desktop-only for V1)

**Done when:** Full MVP is functional end-to-end. User can create a guidebook, get AI content suggestions, build pages with blocks, export PDF, publish web version with QR code. All happy paths and basic error states work.

---

### Session 6 (Future): Billing + Launch
**Not needed for MVP testing — execute when ready to go live**

1. Laravel Cashier + Stripe integration
2. Free tier limits (1 guidebook, 5 pages, watermarked PDF)
3. One-time purchase flow for single guidebook unlock
4. Pro subscription for unlimited
5. Landing page with examples (use Jax guide as showcase)
6. Email notifications (welcome, export ready)

---

## 9. Deployment Plan

### Local Development
- **Laravel Herd Pro** provides PHP 8.5, MySQL, Redis, and Meilisearch out of the box — no Docker needed
- Herd's built-in Valet handles local SSL and `.test` domains automatically
- Puppeteer/Chrome: install via `npm install puppeteer` (bundles Chromium) or point Browsershot to system Chrome

### Production Deployment
Production hosting and deployment strategy to be determined separately. The app is a standard Laravel 12 application and is compatible with any Laravel-friendly hosting (Forge, Vapor, Ploi, shared hosting with SSH, etc.).

---

## 10. Critical Implementation Notes (from Self-Review)

These are issues identified during adversarial review that must be addressed during build:

### 10.1 Page Height Estimation in Editor
The editor cannot pixel-perfectly predict PDF page overflow without rendering the HTML. **Solution:** Each block type has a fixed estimated height in the editor:
- Card: 130px
- Hero Image: configurable (user sets height, default 280px)
- Trivia Box: 110px
- Stats Bar: 80px
- Fun Fact: 70px
- Highlight Strip: 65px
- Section Header: 150px (with intro text)
- Tip Box: 90px
- Featured Image: configurable (default 180px)
- Split Feature: 200px

Usable page height = 11in - 1in padding = 10in = 960px. The editor sums block estimated heights and shows:
- Green bar: <80% full
- Yellow bar: 80-95% full
- Red bar + "Page full — move blocks to next page": >95%

This is approximate. The PDF export may still clip content at page boundaries. Users are told to preview PDF and adjust if needed.

### 10.2 Card Grid Layout
Cards auto-flow into a 2-column grid by default. Each page has a `card_columns` setting (2 or 3) that the user can toggle in page settings. When set to 3, cards render in `card-grid-3`. Cards are always placed inside a single grid container per page — they do not appear as individual full-width rows.

### 10.3 Font Loading for PDF
**Do NOT use Google Fonts CDN links in print templates.** Self-host all fonts:
1. Download `.woff2` files for all 4 font presets during build
2. Store in `public/fonts/` directory
3. Print Blade template uses `@font-face` declarations with absolute server paths:
   ```css
   @font-face {
     font-family: 'Playfair Display';
     src: url('/absolute/path/to/public/fonts/playfair-display-900.woff2') format('woff2');
     font-weight: 900;
   }
   ```
4. Browsershot references the HTML with local font paths — guaranteed rendering.

### 10.4 Image Handling in PDF Pipeline
When PdfRenderer assembles the HTML for Browsershot:
1. Scan all blocks for `image_path` fields
2. For each S3 image: download to `/tmp/stadius/export-{id}/`
3. Replace S3 URLs in HTML with `file:///tmp/...` absolute paths
4. Pass HTML with local image paths to Browsershot
5. After PDF generation, delete the temp directory
6. This ensures Puppeteer doesn't need network access to S3 during rendering.

### 10.5 Cover Page
The cover page is a special page type (`page_type: cover`) with a fixed layout:
- Full-page background image (uploaded by user or from Unsplash URL)
- Gradient overlay auto-generated from the guidebook's color scheme (primary → secondary, 60% opacity)
- Centered text: eyebrow (e.g., "YOUR LOCAL GUIDE TO"), city name (large), subtitle, tagline
- These fields are edited in BlockProperties panel when the cover page is selected
- Every new guidebook starts with a cover page that cannot be deleted

### 10.6 AI Rate Limiting
All `/api/*/ai/*` routes use Laravel's `throttle:20,60` middleware (20 requests per 60 minutes per user). Free tier users get a lifetime total of 10 AI generation requests. Pro users get unlimited (still rate-limited for cost control). Rate limit headers are returned so the frontend can show remaining quota.

### 10.7 API Route Authentication
All `/api/*` routes are protected by:
- `auth` middleware (session-based, same cookie as Inertia pages)
- `EnsureGuidebookOwner` middleware for any route with `{guidebook}` parameter
- CSRF token is handled by Inertia automatically (same-origin requests)
- No Sanctum tokens needed — the Vue frontend and Laravel backend share the same domain and session.

---

## 11. Known Limitations (V1)

*Renumbered — sections 12, 13, 14 follow below.*

1. **No real-time collaboration** — single user per guidebook (multi-user is V2)
2. **No custom CSS** — users choose from presets only (advanced customization is V2)
3. **No print-on-demand integration** — PDF download only, no physical printing/shipping (V2 feature: integrate with Lulu, Blurb, or similar)
4. **Page overflow is approximate** — the editor estimates when a page is "full" based on block heights, but exact pixel overflow detection requires rendering the HTML (we show a warning but can't guarantee pixel-perfect before export)
5. **AI content quality varies** — suggestions are a starting point, not final copy. Users should review and edit.
6. **Image optimization is manual** — users must upload reasonably sized images. No auto-cropping or smart resize in V1.
7. **Single language** — English only in V1
8. **No version history** — no undo beyond session, no revision history (V2)
9. **Limited to letter size** — 8.5×11 inch only. A4 support in V2.

---

## 12. Future Features (V2+)

- **Print-on-demand:** Integrate with Lulu API or Peecho — users click "Order Prints" and get physical copies delivered. Premium feature.
- **Monthly events module:** Separate mini-editor for monthly event pages (1-2 pages) that can be regenerated each month with fresh local events from AI + event APIs (Eventbrite, etc.)
- **Custom domains:** Pro users can serve web version on their own domain (CNAME setup)
- **Multi-user / teams:** Property management companies with multiple properties
- **Template marketplace:** Users share/sell their guidebook designs
- **A4 support:** International paper size
- **Analytics dashboard:** Track QR scans, web version pageviews, time on page
- **White-label:** Remove Stadius branding for enterprise customers
- **Bulk operations:** Duplicate a guidebook for a different property in the same city (same content, different cover/intro)
- **Mobile editor:** Simplified mobile editing experience
- **Zapier/Make integration:** Auto-update web version when source data changes

---

## 13. Launch Strategy

### Initial Audience
- Airbnb host communities (Reddit r/AirBnB, r/AirBnBHosts, Facebook groups)
- Property management forums
- Airbnb host meetups / local STR associations

### Pitch
"Stop handing guests a binder of takeout menus. Stadius lets you create a gorgeous printed guidebook for your Airbnb — with AI-powered local recommendations — in under 30 minutes."

### Launch Channels
1. Product Hunt launch
2. Reddit posts in host communities (show the Jax guide as proof of concept)
3. Facebook Airbnb host groups
4. SEO content: "How to create an Airbnb guest guidebook" (blog posts)
5. YouTube walkthrough video (screen recording of creating a guide in real-time)

### Success Metrics (First 90 Days)
- 500 sign-ups
- 100 guidebooks created
- 50 PDFs exported
- 10 paying customers
- <5% churn on subscriptions

---

*End of Product Specification*
