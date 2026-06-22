# Screencold — E2E Playwright Test Scenarios (Wave 3: UI Components & Global UX)

> Covers interactive UI components and global UX features: command palette, shortcuts, sidebar, keyboard shortcuts, focus trap, onboarding tour, celebration overlay, cookie consent, error boundary, public header, dashboard layout, and skip-to-content.
> Total: **~65 scenarios**

---

## Contents

1. [Command Palette (Cmd+K)](#1-command-palette-cmdk)
2. [Keyboard Shortcuts Panel (?)](#2-keyboard-shortcuts-panel-)
3. [Global Keyboard Shortcuts](#3-global-keyboard-shortcuts)
4. [Focus Trap](#4-focus-trap)
5. [Dashboard Sidebar](#5-dashboard-sidebar)
6. [Onboarding Tour](#6-onboarding-tour)
7. [First Audit Celebration](#7-first-audit-celebration)
8. [Cookie Consent Banner](#8-cookie-consent-banner)
9. [Error Boundary](#9-error-boundary)
10. [Public Header & Mobile Menu](#10-public-header--mobile-menu)
11. [Dashboard Layout (Mobile Sidebar)](#11-dashboard-layout-mobile-sidebar)
12. [Skip-to-Content Link](#12-skip-to-content-link)

---

## 1. Command Palette (Cmd+K)

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | CommandPalette_opens_with_Cmd_K | Authenticated user on dashboard, press `Meta+K` (Mac) / `Ctrl+K` (Windows), verify palette dialog opens with search input auto-focused, backdrop visible, aria-modal="true" |
| P0 | Success | CommandPalette_search_filters_commands | Open palette, type "audit", verify only matching items shown (Audits + Nouvel audit), non-matching items (Campagnes, Tableau de bord, Paramètres) hidden |
| P0 | Success | CommandPalette_keyboard_arrows_navigation | Open palette, press ArrowDown twice, verify second item has selected styling (data-selected="true"), ArrowUp goes back to first |
| P0 | Success | CommandPalette_enter_executes_selected | Open palette, type "dashboard", press Enter, verify navigated to /dashboard, palette closes |
| P0 | Success | CommandPalette_escape_closes | Open palette, press Escape, verify palette removed from DOM, focus restored to previously focused element |
| P0 | Success | CommandPalette_click_backdrop_closes | Open palette, click the semi-transparent backdrop, verify palette closes |
| P0 | Success | CommandPalette_mouse_hover_changes_selection | Open palette, hover mouse over third command, verify selection highlight moves to that item, pressing Enter executes it |
| P0 | Success | CommandPalette_search_case_insensitive | Open palette, type "TABLEAU", verify "Tableau de bord" appears in results (case-insensitive matching on label and description) |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | CommandPalette_no_results_empty_state | Open palette, type "zzzznotexist", verify empty state shows "Aucune commande trouvée pour \"zzzznotexist\"" with no grouped categories rendered |
| P1 | Edge | CommandPalette_wrap_around_keyboard_nav | Open palette, press ArrowDown until last item, press ArrowDown again, verify selection wraps to first item in the list |
| P1 | Edge | CommandPalette_rapid_open_close | Press Cmd+K, immediately press Escape, press Cmd+K again, verify palette opens fresh (empty query, selection at index 0, no stale state) |
| P1 | Edge | CommandPalette_search_query_reset_on_close | Type "audit" into palette, close with Escape, reopen with Cmd+K, verify search input is empty and all items displayed |

---

## 2. Keyboard Shortcuts Panel (?)

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | ShortcutsPanel_opens_with_question_mark | Authenticated user on dashboard, press `?`, verify shortcuts panel opens with dialog aria-label="Raccourcis clavier", all 3 shortcut groups (Navigation, Actions, Général) displayed |
| P0 | Success | ShortcutsPanel_displays_all_shortcuts | Open panel, verify Navigation group shows Cmd+K, G puis D, G puis A, G puis C, G puis P; Actions shows N, Maj+N; Général shows ? and ESC — each with matching description |
| P0 | Success | ShortcutsPanel_escape_closes | Open panel, press Escape, verify panel closes, backdrop removed |
| P0 | Success | ShortcutsPanel_x_button_closes | Open panel, click X button in header, verify panel closes |
| P0 | Success | ShortcutsPanel_click_backdrop_closes | Open panel, click backdrop overlay, verify panel closes |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | ShortcutsPanel_focus_trap_active | Open panel, press Tab repeatedly, verify focus cycles only within panel elements (close button, no external elements reached) |
| P1 | Edge | ShortcutsPanel_shortcut_toggles | Press `?` to open panel, press `?` again to close, verify panel opens then closes (shortcut acts as toggle) |

---

## 3. Global Keyboard Shortcuts

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | Shortcut_leader_g_d_navigates_dashboard | On dashboard, press `g` then within 600ms press `d`, verify navigated to /dashboard. Leader indicator toast appears showing available keys (D, A, C, P) during leader mode |
| P0 | Success | Shortcut_leader_g_a_navigates_audits | Press `g` then `a`, verify navigated to /audits |
| P0 | Success | Shortcut_leader_g_c_navigates_campaigns | Press `g` then `c`, verify navigated to /campaigns |
| P0 | Success | Shortcut_leader_g_p_navigates_settings | Press `g` then `p`, verify navigated to /settings |
| P0 | Success | Shortcut_direct_n_navigates_new_audit | Press `n` (no leader), verify navigated to /audits/new |
| P0 | Success | Shortcut_direct_shift_N_navigates_new_campaign | Press `Shift+n`, verify navigated to /campaigns/new |
| P0 | Success | Shortcut_direct_question_mark_toggles_panel | Press `?`, verify shortcuts panel opens. Press `?` again, verify shortcuts panel closes |
| P0 | Success | Shortcut_Cmd_K_opens_palette | Press `Meta+K` / `Ctrl+K`, verify command palette opens |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | Shortcut_leader_timeout_clears | Press `g` (leader indicator appears), wait 700ms without pressing second key, verify leader indicator disappears, no navigation occurs |
| P1 | Edge | Shortcut_leader_invalid_follow_up_key | Press `g` then `x` (no shortcut defined), verify leader mode ends, no navigation occurs, no error |
| P1 | Edge | Shortcut_skipped_when_focus_in_input | Focus cursor in a text input, press `n`, verify NOT navigated to /audits/new (shortcut should be suppressed in editable elements) |
| P1 | Edge | Shortcut_leader_skipped_when_focus_in_input | Focus in a text input, press `g` then `d`, verify NOT navigated to /dashboard |
| P1 | Edge | Shortcut_shift_N_in_lowercase | Press `n` (without shift), verify goes to /audits/new, NOT to /campaigns/new (distinguishes between `n` and `Shift+n`) |
| P2 | Edge | Shortcut_leader_window_blur_clears | Press `g` (leader mode starts), switch browser tab (window blur event fires), return, verify leader mode is cleared, no pending sequence |

---

## 4. Focus Trap

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | FocusTrap_tab_cycles_forward | Open command palette, press Tab repeatedly, verify focus cycles through search input, command buttons, and close-adjacent elements without leaving the dialog |
| P0 | Success | FocusTrap_shift_tab_cycles_backward | Open command palette, press Shift+Tab repeatedly, verify focus cycles backward through focusable elements within the dialog |
| P0 | Success | FocusTrap_auto_focuses_first_element | Open shortcuts panel, verify first focusable element (close X button) receives focus automatically within 50ms |
| P0 | Success | FocusTrap_restores_focus_on_close | Focus a nav link in sidebar, press `?` to open shortcuts panel (focus trapped inside), press Escape to close, verify focus returns to the sidebar nav link |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | FocusTrap_no_focusable_elements | Open a hypothetical dialog with zero focusable children (tabindex="-1" on everything), press Tab, verify default prevented but no crash |

---

## 5. Dashboard Sidebar

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | Sidebar_displays_all_nav_items | Authenticated user on dashboard, verify sidebar shows: Tableau de bord, Audits, Campagnes, Paramètres with correct icons, all linking to correct href paths |
| P0 | Success | Sidebar_active_route_highlighted | Navigate to /audits, verify "Audits" nav item has active styling (bg-info-50 text-info-700). Navigate to /campaigns, verify highlight moves to "Campagnes" |
| P0 | Success | Sidebar_collapse_and_expand | Click collapse button (ChevronLeft), verify sidebar width reduces from w-64 to w-16, logo text hidden, nav labels hidden, toggle button icon rotates 180°. Click again to expand |
| P0 | Success | Sidebar_collapsed_shows_icons_only | Collapse sidebar, verify nav items show icons only (no text labels), logo shows icon only, user avatar shows without name/plan |
| P0 | Success | Sidebar_user_dropdown_displays_menu_items | Click user avatar area in sidebar, verify dropdown shows: Mon compte, Équipes, Clés API, Facturation, separator, Se déconnecter |
| P0 | Success | Sidebar_logout_clears_session | Click user avatar, click "Se déconnecter", verify signOut() called, user redirected to /login, session cookie cleared |
| P0 | Success | Sidebar_plan_badge_displayed | Verify user's plan badge (e.g. "FREE", "PRO") shown next to user name in sidebar, displayed as Badge component with outline variant |
| P0 | Success | Sidebar_keyboard_shortcuts_button | When sidebar expanded, verify "Raccourcis clavier" button visible at bottom with `?` kbd hint. Click it, verify shortcuts panel opens |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | Sidebar_user_avatar_fallback | User without name/image, verify avatar shows first letter of email or "U" fallback, no broken image |
| P1 | Edge | Sidebar_active_route_with_subpath | Navigate to /settings/billing, verify "Paramètres" nav item is highlighted (startsWith match), not just exact match |
| P1 | Edge | Sidebar_collapsed_shortcut_button | Collapse sidebar, verify shortcuts button changes to icon-only variant with aria-label="Raccourcis clavier", still clickable |

---

## 6. Onboarding Tour

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | Onboarding_shows_on_first_visit | New user (no localStorage "screencold-onboarding-completed"), navigate to /dashboard, verify onboarding tour modal appears with step 1/3 showing "Entrez une URL" and Search icon |
| P0 | Success | Onboarding_next_advances_to_step_2 | On step 1, click "Suivant", verify step counter shows 2/3, title changes to "Consultez les résultats", icon changes to BarChart3, "Précédent" button becomes enabled |
| P0 | Success | Onboarding_previous_returns_to_step_1 | Advance to step 2, click "Précédent", verify back on step 1 with "Entrez une URL" title, "Précédent" button disabled |
| P0 | Success | Onboarding_completes_on_step_3 | On step 3 ("Envoyez l'email"), verify button text is "Commencer" (not "Suivant"). Click it, verify modal closes, localStorage "screencold-onboarding-completed" set to "true" |
| P0 | Success | Onboarding_does_not_show_after_completion | Complete onboarding, refresh page, verify tour does not reappear |
| P0 | Success | Onboarding_restart_from_help_menu | Click help (?) button in dashboard header, click "Revoir l'introduction", verify onboarding tour reopens at step 1 (localStorage key removed, step reset to 0) |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | Onboarding_close_with_X | Click X close button on step 2, verify modal closes, localStorage set to completed=true, tour does not show on next page load |
| P1 | Edge | Onboarding_focus_trap_active | Open tour, press Tab repeatedly, verify focus cycles only within modal (next/prev buttons, close button) — no external elements reachable |
| P1 | Edge | Onboarding_keyboard_escape_not_listened | Tour modal open, press Escape, verify tour does NOT close (no Escape handler — close only via X or completing). Confirm behavior is intentional |

---

## 7. First Audit Celebration

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | Celebration_shows_after_first_audit | Complete first audit (audit transitions from PROCESSING to READY), verify celebration overlay appears with "Bravo ! Votre premier audit est prêt" heading, PartyPopper icon, and confetti animation |
| P0 | Success | Celebration_confetti_auto_hides | Verify confetti elements visible initially, wait 3 seconds, verify confetti elements no longer rendered (pointer-events-none container with confetti divs removed) |
| P0 | Success | Celebration_view_email_navigates_to_audit | Click "Voir l'email généré" button, verify navigation to /audits/{auditId} with Mail icon and ArrowRight |
| P0 | Success | Celebration_copy_link_copies_to_clipboard | Click "Copier le lien de l'audit" button, verify navigator.clipboard.readText() returns the full audit URL (window.location.origin + /audits/{auditId}) |
| P0 | Success | Celebration_continue_without_results | Click "Continuer sans voir les résultats" text link, verify overlay closes, user remains on current page |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | Celebration_clipboard_failure | Mock clipboard API to throw/return false, click "Copier le lien", verify no crash, button click still handled gracefully |
| P1 | Edge | Celebration_confetti_content | Verify confetti emoji set includes only 🎉 🎊 ✨ 🎯 🚀, verify at least one confetti item renders with animate-bounce class |

---

## 8. Cookie Consent Banner

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | Cookie_consent_shows_on_first_visit | Visit any page without localStorage "screencold-cookie-consent", verify banner appears at bottom with text about cookies and 3 buttons: Personnaliser, Refuser, Tout accepter |
| P0 | Success | Cookie_consent_accept_all | Click "Tout accepter", verify banner disappears, localStorage has {necessary: true, analytics: true, marketing: true}, cookie-consent event dispatched with full prefs |
| P0 | Success | Cookie_consent_reject_all | Click "Refuser", verify banner disappears, localStorage has {necessary: true, analytics: false, marketing: false} |
| P0 | Success | Cookie_consent_customize_panel | Click "Personnaliser", verify settings panel slides open showing 3 toggle rows: Nécessaires (disabled/always checked), Analytics (toggleable), Marketing (toggleable) |
| P0 | Success | Cookie_consent_save_custom | Toggle Analytics ON, Marketing OFF, click "Enregistrer", verify banner collapses, localStorage has matching preferences, event dispatched |
| P0 | Success | Cookie_consent_does_not_show_after_consent | Accept cookies, refresh page, verify banner does not reappear |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | Cookie_consent_necessary_always_checked | Open customize panel, verify "Nécessaires" checkbox is checked with disabled attribute, cannot be toggled |
| P1 | Edge | Cookie_consent_backdrop_dismisses_customize | Open customize panel, click backdrop, verify settings panel closes, banner remains visible |
| P1 | Edge | Cookie_consent_corrupted_storage | Set localStorage "screencold-cookie-consent" to invalid JSON "{bad", reload, verify banner shows (graceful parse failure = no consent = show banner) |

---

## 9. Error Boundary

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | ErrorBoundary_catches_render_error | Inject a component that throws during render inside ErrorBoundary, verify fallback UI appears: warning triangle icon, "Une erreur est survenue" heading, error message, "Réessayer" and "Recharger" buttons |
| P0 | Success | ErrorBoundary_reset_recovery | Click "Réessayer", verify ErrorBoundary state resets (hasError=false), children re-render, normal UI restored |
| P0 | Success | ErrorBoundary_reload_page | Click "Recharger", verify window.location.reload() called |
| P0 | Success | ErrorBoundary_console_error_logged | Trigger error boundary, verify console.error called with "[ErrorBoundary] Erreur interceptée:" prefix and error object |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | ErrorBoundary_custom_fallback | Wrap content with ErrorBoundary with fallback prop, trigger error, verify custom fallback renders instead of the default error UI |
| P1 | Edge | ErrorBoundary_no_error_passthrough | Render ErrorBoundary with healthy children, verify children render normally, boundary does not interfere |

---

## 10. Public Header & Mobile Menu

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | Public_header_displays_nav_links | Visit landing page (/), verify header shows logo "ScreenCold", nav links: Fonctionnalités (/#features), Tarifs (/pricing), Blog (/blog), and CTA: "Se connecter" (desktop only) + "Démarrer" button |
| P0 | Success | Public_header_mobile_hamburger_opens_menu | Resize viewport to <768px, verify hamburger Menu icon visible, desktop nav links hidden. Click hamburger, verify mobile menu panel slides down with nav links + "Se connecter" link |
| P0 | Success | Public_header_mobile_menu_closes_on_link_click | Open mobile menu, click "Blog", verify menu closes (mobileMenuOpen=false), navigation proceeds to /blog |
| P0 | Success | Public_header_mobile_menu_toggle_x | Open mobile menu, verify icon changes to X. Click X, verify menu closes, icon returns to hamburger |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | Public_header_sticky_on_scroll | Scroll down 500px, verify header remains fixed at top with backdrop-blur effect (sticky top-0 z-40) |
| P1 | Edge | Public_header_mobile_menu_overlap | Open mobile menu on viewport <768px, verify menu appears below header border, does not overlap main content incorrectly, all links tappable |

---

## 11. Dashboard Layout (Mobile Sidebar)

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | Dashboard_mobile_sidebar_overlay | Resize viewport to <1024px, verify sidebar is hidden by default (lg:static lg:block with hidden class). Click hamburger (Menu) in dashboard header, verify sidebar overlay appears with semi-transparent backdrop (bg-black/50) |
| P0 | Success | Dashboard_mobile_sidebar_backdrop_closes | Open mobile sidebar overlay, click the backdrop (bg-black/50), verify overlay closes, sidebar hidden again |
| P0 | Success | Dashboard_mobile_sidebar_navigation_works | Open mobile sidebar, click "Audits" nav link, verify navigates to /audits, mobile sidebar closes automatically |

### Error / Edge

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P1 | Edge | Dashboard_header_hamburger_hidden_on_lg | Resize viewport to ≥1024px, verify hamburger menu button in dashboard header has lg:hidden class and is not visible |
| P1 | Edge | Dashboard_main_content_skip_link_target | Verify `<main id="main-content">` exists in the DOM to serve as skip-to-content target |

---

## 12. Skip-to-Content Link

### Success

| Prio | Cat | Test Name | Description |
|------|-----|-----------|-------------|
| P0 | Success | SkipLink_visible_on_keyboard_focus | Visit any page, press Tab immediately on load, verify "Skip to main content" link becomes visible (focus:not-sr-only with bg-info-600 styling) at top-left of viewport |
| P0 | Success | SkipLink_navigates_to_main_content | Press Tab to focus skip link, press Enter, verify focus moves to `#main-content` element, URL hash updates to #main-content |

---

## Summary of Test Coverage

| Area | Success | Error/Edge | Total |
|------|---------|------------|-------|
| Command Palette | 8 | 4 | 12 |
| Shortcuts Panel | 5 | 2 | 7 |
| Keyboard Shortcuts | 8 | 6 | 14 |
| Focus Trap | 4 | 1 | 5 |
| Dashboard Sidebar | 8 | 3 | 11 |
| Onboarding Tour | 6 | 3 | 9 |
| First Audit Celebration | 5 | 2 | 7 |
| Cookie Consent Banner | 6 | 3 | 9 |
| Error Boundary | 4 | 2 | 6 |
| Public Header & Mobile Menu | 4 | 2 | 6 |
| Dashboard Layout (Mobile) | 3 | 2 | 5 |
| Skip-to-Content Link | 2 | 0 | 2 |
| **Total** | **63** | **30** | **93** |

> Note: Tests above are grouped logically by component, but many scenarios overlap (e.g., shortcut `?` opening shortcuts panel tests both the keyboard shortcut and the shortcuts panel). Unique behavioral scenarios: **~65**.
