# Wave 4 E2E Tests: Mobile, Responsive & Cross-browser

## Scope
Test responsive rendering at mobile/tablet breakpoints, cross-browser compatibility (Firefox, WebKit), touch interactions, clipboard API, file upload, localStorage, and keyboard shortcuts in non-Chromium browsers.

## Prerequisites
- Server running at BASE_URL (default http://localhost:3000)
- Playwright browsers installed (chromium, firefox, webkit)
- Config updated with Firefox + WebKit projects

---

## Mobile Responsive (iPhone 14 viewport: 390x844)

### M1: Mobile Landing Page – Hamburger Menu
**Given** a visitor on the landing page at 390x844 viewport
**When** they tap the hamburger menu button
**Then** the mobile navigation panel opens showing all nav links
**And** tapping the X button closes the panel

### M2: Mobile Landing Page – Hero CTAs Tappable
**Given** a visitor on the landing page at 390x844 viewport
**Then** the "Essayer gratuitement" and "Voir les tarifs" buttons are visible and clickable

### M3: Mobile Landing Page – Features Stack Vertically
**Given** a visitor on the landing page at 390x844 viewport
**Then** all feature cards ("Audits complets", "Rapide et automatisé", etc.) are visible in a stacked vertical layout

### M4: Mobile Pricing – Cards Stack Vertically
**Given** a visitor on the pricing page at 390x844 viewport
**Then** all 4 plan cards (Gratuit, Starter, Pro, Agency) are visible without horizontal scroll
**And** the page has no horizontal overflow

### M5: Mobile Pricing – Billing Toggle Works
**Given** a visitor on the pricing page at 390x844 viewport
**When** they tap the billing toggle (Mensuel/Annuel)
**Then** annual prices display with -20% savings
**And** toggling back shows monthly prices

### M6: Mobile FAQ – Accordion Works
**Given** a visitor on the FAQ page at 390x844 viewport
**When** they tap an accordion summary
**Then** the details element opens
**And** tapping again closes it

### M7: Mobile Blog – Cards Single Column
**Given** a visitor on the blog page at 390x844 viewport
**Then** article cards are visible and page has no horizontal overflow

### M8: Mobile Blog – Filter Buttons Visible
**Given** a visitor on the blog page at 390x844 viewport
**Then** all category filter buttons (Tous, Cold Outreach, UX Design, CRO, Productivité, Industry) are visible

### M9: Mobile Dashboard – Sidebar Becomes Overlay
**Given** an authenticated user on the dashboard at 390x844 viewport
**When** they tap the hamburger button in the header
**Then** the sidebar opens as an overlay
**And** the backdrop is visible

### M10: Mobile Dashboard – Sidebar Backdrop Closes
**Given** an authenticated user on the dashboard at 390x844 viewport with open sidebar
**When** they tap the backdrop
**Then** the sidebar closes

### M11: Mobile Dashboard – Sidebar Navigation Works
**Given** an authenticated user on the dashboard at 390x844 viewport
**When** they open the sidebar and tap "Audits"
**Then** they navigate to /audits

### M12: Mobile Dashboard – Dashboard Content Not Overflowing
**Given** an authenticated user on the dashboard at 390x844 viewport
**Then** the main content has no horizontal scroll

### M13: Mobile Audits – List Layout
**Given** an authenticated user on the audits page at 390x844 viewport
**Then** the search input and audit cards are visible without horizontal overflow

### M14: Mobile Campaigns – Detail Page Prospect Table
**Given** an authenticated user on a campaign detail page at 390x844 viewport
**Then** the prospect table is visible with horizontal scroll wrapper or responsive adaptation

### M15: Mobile Settings – No Horizontal Overflow
**Given** an authenticated user on the settings page at 390x844 viewport
**Then** all form fields are full width
**And** there is no horizontal scroll

### M16: Mobile Settings Billing – No Overflow
**Given** an authenticated user on the settings billing page at 390x844 viewport
**Then** plan cards stack vertically without horizontal overflow

---

## Tablet Responsive (iPad: 768x1024)

### T1: Tablet – Sidebar Visible at md Breakpoint
**Given** an authenticated user on the dashboard at 768x1024 viewport
**Then** the sidebar with nav items is visible (not overlay)

### T2: Tablet – Grid Adapts to 2 Columns
**Given** an authenticated user on the dashboard at 768x1024 viewport
**Then** the stats cards or grid items display in a 2-column layout

### T3: Tablet – No Horizontal Overflow on Public Pages
**Given** a visitor on the landing page at 768x1024 viewport
**Then** there is no horizontal scroll

### T4: Tablet – Sidebar Collapse on Tablet
**Given** an authenticated user on the dashboard at 768x1024 viewport
**When** they click the sidebar collapse button
**Then** the sidebar collapses to icon-only mode

---

## Cross-browser: Firefox

### F1: Firefox – Celebration Copy Link (Clipboard API)
**Given** an authenticated user in Firefox who creates their first audit
**When** the celebration modal shows and they click "Copier le lien"
**Then** the audit link is written to the clipboard

### F2: Firefox – API Key Copy (Clipboard API)
**Given** an authenticated user in Firefox on the API keys settings page
**When** they click the copy button on an API key
**Then** the key prefix is copied to the clipboard

### F3: Firefox – CSV File Upload (File API)
**Given** an authenticated user in Firefox on the campaigns page
**When** they open the CSV import modal and select a file
**Then** the file is accepted and the upload flow proceeds

### F4: Firefox – localStorage Access
**Given** an authenticated user in Firefox
**When** the onboarding tour completes
**Then** the "screencold-onboarding-completed" item is set in localStorage

### F5: Firefox – Meta+K Command Palette
**Given** an authenticated user in Firefox
**When** they press Meta+K
**Then** the command palette dialog opens

### F6: Firefox – Keyboard Shortcuts Panel
**Given** an authenticated user in Firefox
**When** they press "?"
**Then** the keyboard shortcuts panel opens

### F7: Firefox – CSS Grid/Flexbox Rendering
**Given** a visitor in Firefox on the pricing page
**Then** all 4 plan cards are rendered properly in correct layout

---

## Cross-browser: WebKit

### W1: WebKit – Celebration Copy Link (Clipboard API)
**Given** an authenticated user in WebKit who creates their first audit
**When** the celebration modal shows and they click "Copier le lien"
**Then** the audit link is written to the clipboard

### W2: WebKit – API Key Copy (Clipboard API)
**Given** an authenticated user in WebKit on the API keys settings page
**When** they click the copy button on an API key
**Then** the key prefix is copied to the clipboard

### W3: WebKit – CSV File Upload (File API)
**Given** an authenticated user in WebKit on the campaigns page
**When** they open the CSV import modal and select a file
**Then** the file is accepted and the upload flow proceeds

### W4: WebKit – localStorage Access
**Given** an authenticated user in WebKit
**When** the onboarding tour completes
**Then** the "screencold-onboarding-completed" item is set in localStorage

### W5: WebKit – Meta+K Command Palette
**Given** an authenticated user in WebKit
**When** they press Meta+K
**Then** the command palette dialog opens

### W6: WebKit – CSS Grid/Flexbox Rendering
**Given** a visitor in WebKit on the blog page
**Then** the article cards are properly laid out in the grid

---

## Touch Interactions

### X1: Mobile Touch – Sidebar Opens via Hamburger
**Given** an authenticated user on the dashboard at mobile viewport with touch enabled
**When** they tap the hamburger button
**Then** the sidebar overlay opens

### X2: Mobile Touch – Sidebar Tap Navigation
**Given** an authenticated user on the dashboard at mobile viewport with touch enabled
**When** they open the sidebar and tap "Audits"
**Then** they navigate to the audits page

### X3: Mobile Touch – Pricing Billing Toggle Tap
**Given** a visitor on the pricing page at mobile viewport with touch enabled
**When** they tap the billing toggle
**Then** annual prices display

### X4: Mobile Touch – FAQ Accordion Tap
**Given** a visitor on the FAQ page at mobile viewport with touch enabled
**When** they tap an accordion summary
**Then** the accordion opens

### X5: Mobile Touch – Sidebar Swipe/Backdrop Tap
**Given** an authenticated user on the dashboard at mobile viewport with touch enabled and sidebar open
**When** they tap the backdrop area
**Then** the sidebar closes
