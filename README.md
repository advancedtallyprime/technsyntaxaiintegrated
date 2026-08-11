# Tech'nSyntax — Official Business Website

A static, responsive business website for **Tech'nSyntax** — a technology solutions company offering web development, data analytics, AI solutions, digital services, technical training, and UI/UX & graphic design.

## Getting Started

No build step or server required.

1. Unzip the project.
2. Open `index.html` directly in any modern web browser.

That's it — the whole site runs from static files.

## Tech Stack

- **HTML5** — semantic markup (`header`, `nav`, `main`, `section`, `article`, `footer`)
- **CSS3** — mobile-first architecture: unprefixed base styles in `css/main.css` target the smallest phones (320px), and `css/responsive.css` progressively enhances the layout with `min-width` media queries only (768px tablet, 960px desktop-nav, 1200px desktop) — nothing is ever built desktop-first and shrunk down
- **Vanilla JavaScript** — no frameworks, no build tools, no dependencies

No React, Vue, Angular, Node.js, PHP, or backend of any kind is used.

## Project Structure

```
Tech-nSyntax/
├── index.html          Home page
├── about.html           Company info, mission, vision, values
├── services.html        Six service offerings in detail
├── portfolio.html        Featured project showcase
├── academy.html          Tech'nSyntax Academy (courses, certification)
├── blog.html              Technology blog with category filter
├── contact.html          Contact info + validated contact form
├── README.md
├── assets/                Reserved for future shared assets
├── css/
│   ├── main.css          Design tokens, base styles, components
│   ├── responsive.css   Mobile/tablet/desktop breakpoints
│   └── animations.css   Keyframes & motion
├── js/
│   └── main.js            Mobile menu, smooth scroll, active nav,
│                           scroll reveal, scroll-to-top, form
│                           validation, dynamic footer year
├── images/
│   ├── hero/               Hero visuals (placeholder)
│   ├── services/           One image per service (placeholder)
│   ├── portfolio/          Project thumbnails (placeholder)
│   ├── blog/                Blog post covers (placeholder)
│   └── about/               About page imagery (placeholder)
├── icons/
│   └── favicon.svg        Hand-coded vector logo mark (not AI-generated)
└── fonts/                  Reserved — fonts are loaded via Google Fonts CDN
```

## Image Placeholders

Per project requirements, **no images were generated or downloaded.** All files under `images/` are empty placeholder files with correct, semantic filenames (e.g. `images/services/service-web.webp`). Replace them with real assets using the same filenames and the site will pick them up automatically — no HTML changes needed.

The only graphic asset that *is* real, functioning code is `icons/favicon.svg`, a small hand-authored vector mark (not AI image generation) used for the browser tab icon and the logo.

## Design System

| Token | Value |
|---|---|
| Primary | `#2563EB` |
| Secondary | `#06B6D4` |
| Dark | `#0F172A` |
| Background | `#F8FAFC` |
| Text | `#1E293B` |

Typography: **Inter** (300–800) for display/body, **JetBrains Mono** as a utility face for eyebrows, labels, and the hero's "code editor" signature element — a nod to the brand name.

## Features

- Fully responsive: 320px (mobile) → 768px (tablet) → 1200px+ (desktop)
- Accessible mobile navigation with hamburger menu, open/close animation, and auto-close on link selection
- Touch targets sized to accessibility guidance — primary nav, buttons, hamburger and social icons all meet or approach the 44px minimum recommended tap target
- Smooth in-page scrolling, scroll-triggered reveal animations with a load-time safety fallback (content is never permanently invisible to crawlers, social-preview scrapers, or fast scrollers), scroll-to-top button
- Client-side contact form validation (name, email, phone, service, message) — no backend, no data is transmitted
- Dynamic footer year via JavaScript
- Graceful placeholder handling for the empty `.webp` files — a labeled placeholder box renders instead of a broken-image icon; swap in real images and it disappears automatically
- Semantic HTML for SEO, with per-page title tags and meta descriptions
- Full Open Graph and Twitter Card meta tags on every page (social share previews)
- JSON-LD structured data (schema.org) on every page — Organization, WebSite, Service list, Course list, CreativeWork portfolio items, Blog/BlogPosting, and ContactPage/ContactPoint markup
- `sitemap.xml` and `robots.txt` included at the project root
- Visible keyboard focus states, alt text placeholders, labeled form fields, and `prefers-reduced-motion` support

## AI Chat Agent (ElevenLabs)

The contact page's contact form has been **replaced** with a custom-built chat interface (Agent: **Tech'nSyntax AI Assistant**, `agent_7001kzp67vyqecjbgqvnzspb087r`, chat-only) — no pre-built widget, no floating launcher bubble. It's a plain HTML chat panel (`js/ai-chat.js`, styled in `css/main.css` under `.ai-chat`) that connects **directly** to the ElevenLabs Agents WebSocket API:

```
wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_7001kzp67vyqecjbgqvnzspb087r
```

Because the agent is public (authentication disabled), **no API key is needed anywhere** — the browser connects with just the agent ID, so nothing sensitive is exposed client-side. This only runs on `contact.html`; no other page has it.

**Before this goes live, double check in the ElevenLabs dashboard:**
1. Agent's **Security** tab — authentication must stay **disabled**, and add `technsyntax.site` (and `www.technsyntax.site`) to the **Allowlist** so only your domain can open a conversation with this agent ID.
2. Agent's **Advanced** tab — confirm **Text only** mode is enabled (so it never expects a mic/audio).

If you'd rather have the form back instead of/alongside the chat agent, that's a quick revert — just ask.

## WhatsApp Contact

A WhatsApp link (`https://wa.me/918451902405`) appears **inline in the contact info list on `contact.html`**, right below Email — styled to match the Email/Availability rows, not a floating button. Update the number by editing the WhatsApp `contact-info-item` in `contact.html` if it changes.

This is separate from the AI chat above — visitors can either type to the AI assistant inline, or tap the WhatsApp link to message you directly.

## Before Deploying — Update These Placeholders

- **OG/Twitter image:** `images/og/og-image.webp` is an empty placeholder (per project's no-generated-images rule). Add a real 1200×630 image at that exact path for social share previews to render correctly.
- **Blog post dates/authors:** the Blog JSON-LD intentionally omits `datePublished` and named author bylines, since inventing placeholder values violates Google's structured-data guidelines. Add real values once posts have known publish dates.

## Contact

- **Domain:** `https://www.technsyntax.site` — used throughout canonical URLs, Open Graph tags, and JSON-LD.
- **Email:** `info@technsyntax.site`
- **No phone number or physical address** is shown anywhere on the site, by design — the business is remote-first with no listed phone contact.
- **Contact form:** this is a static site with no backend, so the form can't submit anywhere on its own. On valid submission, JavaScript builds a pre-filled `mailto:info@technsyntax.site` link (subject + name/email/phone/service/message in the body) and hands off to the visitor's own email app, where they hit send. No form data is transmitted by the site itself.

## Business Positioning Note

Data-related work is intentionally framed as **Data Analytics, ETL, Data Management, Dashboard Development, Reporting Solutions, and Business Intelligence** — Tech'nSyntax is a technology solutions and education company, not a data science company.

## Browser Support

Latest versions of Chrome, Firefox, Safari, and Edge. Uses only standard CSS (custom properties, Grid, Flexbox) and ES5+ JavaScript (`IntersectionObserver` with a graceful fallback).
