# Wave 4 E2E Test Scenarios — Comprehensive User Journeys

These are integration/smoke tests that chain multiple features together to verify the full system works end-to-end. Each scenario represents a real user flow from start to finish.

---

## Scenario 1: Full Registration → First Audit → Celebration → Email

**Goal**: Verify a new user can register, complete onboarding, run their first audit, see the celebration, and view the audit detail with generated email.

### Test 1.1: Register → Onboarding Steps → Completion
1. Navigate to `/register`
2. Fill name, email (`randomEmail()`), password
3. Submit registration form
4. Verify redirect to `/dashboard`
5. Verify onboarding dialog appears with step 1 ("Entrez une URL")
6. Click "Suivant" → verify step 2 content ("Consultez les résultats")
7. Click "Suivant" → verify step 3 content with "Commencer" button
8. Click "Commencer" → verify onboarding dialog closes
9. Verify `localStorage` has `screencold-onboarding-completed = true`

### Test 1.2: First Audit via Quick Audit → API Polling → Ready
1. Register fresh user
2. Navigate to `/dashboard`
3. Fill quick audit URL input with `https://example.com`
4. Click "Analyser" button
5. Route `POST /api/audits` to return `{ auditId, status: "PROCESSING" }`
6. Verify toast notification appears
7. Route `GET /api/audits/[id]` for polling to return `READY` status after mock delay
8. Verify redirect to audit detail page or celebration overlay

### Test 1.3: Celebration Overlay → Copy Link → Navigate to Results
1. Register fresh user (first audit triggers celebration)
2. Mock `POST /api/audits` returning `{ auditId, status: "READY", creditsRemaining: 9 }`
3. Submit audit creation
4. Verify celebration overlay visible with "Bravo" or "premier audit est prêt"
5. Click "Copier le lien" → verify clipboard contains audit URL
6. Click "Continuer sans voir" → verify celebration dismissed

### Test 1.4: Audit Detail → Results → Email Section → Regenerate
1. Register user
2. Route `GET /api/audits/[id]` to return completed audit with issues, score, email subject/body
3. Navigate to `/audits/[id]`
4. Verify company name, overall score visible
5. Verify issues list rendered (severity, category, title)
6. Verify email section visible ("Amélioration de votre site web" subject)
7. Click "Régénérer" → verify `POST /api/audits/[id]/email` called
8. Verify success feedback

---

## Scenario 2: Campaign Creation → CSV Import → Launch → Prospect Table

**Goal**: Verify campaign lifecycle end-to-end: create, import prospects via CSV, launch audits, and verify results.

### Test 2.1: Create Campaign → Verify in List
1. Register fresh user
2. Navigate to `/campaigns`
3. Click "Nouvelle campagne"
4. Fill campaign name
5. Submit form
6. Verify redirect to campaign detail page
7. Verify campaign name in header
8. Navigate to `/campaigns` list → verify campaign appears in list

### Test 2.2: Import Valid CSV → Prospects in Table
1. Register and create campaign
2. Create temporary CSV file with `TEST_CSV.valid` content
3. Use `page.setInputFiles` to upload the CSV
4. Verify prospects table appears
5. Verify company names ("Example Inc", "HTTPBin") visible in table
6. Verify URLs displayed ("example.com", "httpbin.org")

### Test 2.3: Launch Campaign → Status Changes (PROCESSING → DONE)
1. Register and create campaign
2. Import valid CSV with prospects
3. Route `POST /api/campaigns/[id]/launch` to return 200 with `{ success: true }`
4. Click "Lancer" button
5. Verify launch initiated
6. Route `GET /api/campaigns/[id]` to first return PROCESSING stats, then DONE stats
7. Verify progress bar updates from processing to done
8. Verify prospect status badges change from "En attente" to "Terminé"

### Test 2.4: Campaign with Mixed Statuses → Filter Prospects
1. Register and create campaign
2. Import CSV with multiple prospects
3. Route `GET /api/campaigns/[id]` to return mixed statuses (DONE, FAILED, PENDING, PROCESSING)
4. Verify all status badges render correctly
5. Verify score badges for completed audits
6. Verify "Réessayer" button for failed prospects

---

## Scenario 3: Pricing → Registration → Billing → Credits

**Goal**: Verify the pricing-to-billing funnel: visitor browses plans, registers on a free plan, sees billing info, and initiates credit purchase.

### Test 3.1: Pricing Page as Visitor → Plans → Toggle Annual/Monthly
1. Navigate to `/pricing` as unauthenticated visitor
2. Verify four plan cards visible (Gratuit, Starter, Pro, Agency)
3. Verify monthly prices displayed (0€, 49€, 149€, 399€)
4. Toggle to annual billing
5. Verify annual prices displayed with -20% badge
6. Toggle back to monthly
7. Verify monthly prices restored

### Test 3.2: Click "Essayer gratuitement" → Register → Land on Free Plan
1. Navigate to `/pricing`
2. Click "Commencer" or "Essayer gratuitement" on Free/Starter plan
3. Verify redirect to `/register`
4. Complete registration form
5. Submit → verify redirect to `/dashboard`
6. Verify sidebar shows plan badge ("FREE" or "Gratuit")

### Test 3.3: Billing Page → Current Plan → Credit Counter → Transaction History
1. Register and navigate to `/settings/billing`
2. Verify billing page header "Facturation"
3. Verify current plan name visible
4. Verify "Actif" badge visible
5. Verify credit usage counter ("Crédits utilisés ce mois")
6. Verify transaction history section
7. If no transactions, verify "Aucune transaction" empty state

### Test 3.4: Initiate Credit Purchase → Redirect to Stripe
1. Register and navigate to `/settings/billing`
2. Locate "Acheter" button for credit package
3. Route `POST /api/stripe/credits/checkout` to return `{ url: "https://checkout.stripe.com/..." }`
4. Click purchase button
5. Verify redirect to Stripe checkout URL or API call made
6. Verify API response contains Stripe URL

---

## Scenario 4: Team Invitation Full Flow

**Goal**: Verify the complete team invitation lifecycle: owner creates team, invites member, member accepts, both see team members.

### Test 4.1: User A Creates Team → Team Appears in Settings
1. Register User A (owner)
2. Navigate to `/settings/teams`
3. Click "Nouvelle équipe"
4. Fill team name
5. Submit → verify team created
6. Verify team card visible with team name
7. Verify owner badge (star/icon) visible

### Test 4.2: User A Invites User B via API → Invitation Created
1. Register User A (owner)
2. Create team via API `POST /api/teams`
3. Invite User B via `POST /api/teams/[id]/invitations` with User B's email
4. Verify 201 response with invitation data
5. Verify invitation contains email and role
6. List invitations via `GET /api/teams/[id]/invitations` → verify User B's invitation present

### Test 4.3: User B Accepts Invitation → Sees Team on Dashboard
1. Register User A (owner), create team
2. Register User B (member) with different email
3. Invite User B via API → extract token from invitation
4. Log in as User B
5. Navigate to `/teams/join/[token]`
6. Click "Accepter"
7. Verify "Invitation acceptée" toast
8. Navigate to `/settings/teams` as User B → verify team visible
9. Log in as User A → navigate to `/settings/teams/[id]` → verify member list includes User B

### Test 4.4: Invite Already Existing Member → 400 ALREADY_MEMBER
1. Register User A (owner)
2. Create team
3. Invite the owner's own email
4. Verify 400 response with `ALREADY_MEMBER` error
5. Verify duplicate invitation returns appropriate error

---

## Scenario 5: Blog → Article → Share → Action

**Goal**: Verify the blog-to-registration funnel: visitor browses blog, reads article, shares, and converts.

### Test 5.1: Blog Page as Visitor → Browse Categories → Filter Articles
1. Navigate to `/blog` as unauthenticated visitor
2. Verify blog header "Blog" visible
3. Verify category filter buttons (Tous, Cold Outreach, UX Design, CRO, Productivité, Industry)
4. Verify featured article section
5. Verify article cards in grid
6. Click category filter (e.g., "UX Design")
7. Verify URL updates with `?category=ux-design`
8. Verify filtered articles shown
9. Click "Tous" → verify all articles shown again

### Test 5.2: Article Detail Page → Content → TOC → Share Buttons
1. Navigate to `/blog/cold-outreach-stats-2026`
2. Verify article hero image visible
3. Verify article title (h1) visible
4. Verify author card with "ScreenCold Team" and publish date
5. Verify table of contents sidebar with clickable items
6. Verify full article content renders (paragraphs, headings)
7. Verify share buttons visible (Twitter, LinkedIn)
8. Click share button → verify navigates to Twitter/LinkedIn intent URL

### Test 5.3: Article CTA → Register → Post-Registration Redirect
1. Navigate to `/blog/cold-outreach-stats-2026`
2. Scroll to find CTA section ("Commencer gratuitement" or "Essayer gratuitement")
3. Click CTA button
4. Verify redirect to `/register`
5. Complete registration form with `randomEmail()`
6. Submit → verify redirect to `/dashboard`
7. Verify dashboard renders correctly

---

## Summary

| Scenario | Tests | Coverage |
|---|---|---|
| 1. Registration → Audit → Celebration → Email | 4 | Auth, Onboarding, Audit Pipeline, Celebration, Email |
| 2. Campaign → CSV → Launch → Prospect Table | 4 | Campaigns, CSV Import, Launch, Status Tracking |
| 3. Pricing → Registration → Billing → Credits | 4 | Pricing, Auth, Billing, Credits, Stripe |
| 4. Team Invitation Full Flow | 4 | Teams, Invitations, Multi-User, Acceptance |
| 5. Blog → Article → Share → Action | 3 | Blog, Article, Share, CTA, Registration |
| **Total** | **19** | |

Each test is self-contained, uses `randomEmail()` for unique users, leverages mocking where needed for deterministic behavior, and validates the full end-to-end flow without external service dependencies.
