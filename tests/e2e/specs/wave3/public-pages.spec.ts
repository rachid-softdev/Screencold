import { test, expect } from "@playwright/test";

test.describe("Public & Marketing Pages", () => {
  test.describe("Header & Navigation", () => {
    test("Header_displays_on_all_public_pages", async ({ page }) => {
      const pages = ["/", "/pricing", "/faq", "/contact", "/about", "/blog"];
      for (const path of pages) {
        await page.goto(path);
        await expect(page.locator("header")).toBeVisible();
        await expect(page.getByText("ScreenCold").first()).toBeVisible();
        await expect(page.getByText("Fonctionnalités")).toBeVisible();
        await expect(page.getByText("Tarifs")).toBeVisible();
        await expect(page.getByText("Blog")).toBeVisible();
        await expect(page.getByText("Se connecter")).toBeVisible();
        await expect(page.getByText("Démarrer")).toBeVisible();
      }
    });

    test("Header_logo_links_to_home", async ({ page }) => {
      await page.goto("/pricing");
      await page.locator("header a[href='/']").first().click();
      await expect(page).toHaveURL("/");
    });

    test("Header_desktop_nav_links_navigate", async ({ page }) => {
      await page.goto("/");
      await page.getByText("Fonctionnalités").click();
      await expect(page).toHaveURL(/#features/);
      await page.getByText("Tarifs").click();
      await expect(page).toHaveURL("/pricing");
      await page.getByText("Blog").click();
      await expect(page).toHaveURL("/blog");
    });

    test("Header_login_link_navigates", async ({ page }) => {
      await page.goto("/");
      await page.getByText("Se connecter").click();
      await expect(page).toHaveURL("/login");
    });

    test("Header_demarrer_button_navigates", async ({ page }) => {
      await page.goto("/");
      await page.getByText("Démarrer").click();
      await expect(page).toHaveURL("/register");
    });

    test("Header_mobile_hamburger_menu_toggle", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      const menuButton = page.locator("button[aria-label='Menu']");
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(page.getByText("Fonctionnalités")).toBeVisible();
      await expect(page.getByText("Tarifs")).toBeVisible();
      await expect(page.getByText("Blog")).toBeVisible();
      await expect(page.getByText("Se connecter")).toBeVisible();
      await menuButton.click();
      await expect(page.getByText("Fonctionnalités")).not.toBeVisible();
    });

    test("Header_responsive_sticky_behavior", async ({ page }) => {
      await page.goto("/");
      const header = page.locator("header").first();
      await expect(header).toHaveClass(/sticky/);
      await expect(header).toHaveClass(/top-0/);
    });
  });

  test.describe("Landing Page", () => {
    test("Home_hero_section_renders", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText("Audit de sites et emails de prospection")
      ).toBeVisible();
      await expect(page.getByText("Essayer gratuitement")).toBeVisible();
      await expect(page.getByText("Voir les tarifs")).toBeVisible();
    });

    test("Home_no_card_banner_freetext", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText("Aucune carte bancaire requise")
      ).toBeVisible();
    });

    test("Home_features_section_renders", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText("Tout ce dont vous avez besoin")
      ).toBeVisible();
      await expect(page.getByText("Audits complets")).toBeVisible();
      await expect(page.getByText("Rapide et automatisé")).toBeVisible();
      await expect(page.getByText("Emails prêts à envoyer")).toBeVisible();
      await expect(page.getByText("Facile à utiliser")).toBeVisible();
    });

    test("Home_social_proof_section_renders", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText("Utilisé par des agences et freelances en France et en Europe")
      ).toBeVisible();
    });

    test("Home_how_it_works_section", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("Comment ça marche")).toBeVisible();
      await expect(page.getByText("Entrez l'URL")).toBeVisible();
      await expect(page.getByText("Analyse automatique")).toBeVisible();
      await expect(page.getByText("Email personnalisé")).toBeVisible();
    });

    test("Home_testimonials_section_renders", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("Ce que disent nos clients")).toBeVisible();
      await expect(page.getByText("Marie L.")).toBeVisible();
      await expect(page.getByText("Thomas B.")).toBeVisible();
    });

    test("Home_bottom_cta_section", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText("Prêt à transformer votre prospection ?")
      ).toBeVisible();
      await expect(page.getByText("Commencer gratuitement")).toBeVisible();
    });

    test("Home_footer_links", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("footer")).toBeVisible();
      await expect(page.locator("footer").getByText("ScreenCold")).toBeVisible();
      await expect(page.locator("footer").getByText("Tarifs")).toBeVisible();
      await expect(page.locator("footer").getByText("Se connecter")).toBeVisible();
      await expect(page.locator("footer").getByText("S'inscrire")).toBeVisible();
      await expect(page.locator("footer").getByText("2026 ScreenCold")).toBeVisible();
    });

    test("Home_hero_cta_buttons_have_correct_links", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("a[href='/register']").first()).toBeVisible();
      await expect(page.locator("a[href='/pricing']").first()).toBeVisible();
    });
  });

  test.describe("Pricing Page", () => {
    test("Pricing_hero_section", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("tarifs simples et transparents")).toBeVisible();
      await expect(
        page.getByText("Trouvez le plan idéal pour votre agency")
      ).toBeVisible();
    });

    test("Pricing_four_plan_cards_displayed", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("Gratuit")).toBeVisible();
      await expect(page.getByText("Starter")).toBeVisible();
      await expect(page.getByText("Pro")).toBeVisible();
      await expect(page.getByText("Agency")).toBeVisible();
      await expect(page.getByText("0€/mois")).toBeVisible();
      await expect(page.getByText("49€/mois")).toBeVisible();
      await expect(page.getByText("149€/mois")).toBeVisible();
      await expect(page.getByText("399€/mois")).toBeVisible();
    });

    test("Pricing_starter_card_highlighted_popular", async ({ page }) => {
      await page.goto("/pricing");
      const starterCard = page.locator("div.rounded-2xl.border-info-500").first();
      await expect(starterCard).toBeVisible();
      await expect(starterCard.getByText("Populaire")).toBeVisible();
    });

    test("Pricing_billing_toggle_default_monthly", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("Mensuel")).toBeVisible();
      await expect(page.getByText("Annuel")).toBeVisible();
      await expect(page.getByText("0€/mois")).toBeVisible();
      await expect(page.getByText("49€/mois")).toBeVisible();
      await expect(page.getByText("149€/mois")).toBeVisible();
      await expect(page.getByText("399€/mois")).toBeVisible();
    });

    test("Pricing_billing_toggle_to_annual", async ({ page }) => {
      await page.goto("/pricing");
      const toggle = page.locator("button[role='switch']");
      await toggle.click();
      await expect(page.getByText("0€/mois")).toBeVisible();
      await expect(page.getByText("39€/mois")).toBeVisible();
      await expect(page.getByText("119€/mois")).toBeVisible();
      await expect(page.getByText("319€/mois")).toBeVisible();
      await expect(page.getByText("-20%")).toBeVisible();
    });

    test("Pricing_billing_toggle_back_to_monthly", async ({ page }) => {
      await page.goto("/pricing");
      const toggle = page.locator("button[role='switch']");
      await toggle.click();
      await expect(page.getByText("-20%")).toBeVisible();
      await toggle.click();
      await expect(page.getByText("49€/mois")).toBeVisible();
      await expect(page.getByText("149€/mois")).toBeVisible();
      await expect(page.getByText("399€/mois")).toBeVisible();
      await expect(page.getByText("-20%")).not.toBeVisible();
    });

    test("Pricing_button_texts_per_plan", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("Contacter les ventes")).toBeVisible();
      await expect(page.getByText("Commencer").first()).toBeVisible();
    });

    test("Pricing_feature_comparison_table", async ({ page }) => {
      await page.goto("/pricing");
      await expect(
        page.getByText("Comparaison des fonctionnalités")
      ).toBeVisible();
      const table = page.locator("table");
      await expect(table).toBeVisible();
      await expect(table.getByText("Gratuit")).toBeVisible();
      await expect(table.getByText("Starter")).toBeVisible();
      await expect(table.getByText("Pro")).toBeVisible();
      await expect(table.getByText("Agency")).toBeVisible();
      await expect(table.getByText("Crédits/mois")).toBeVisible();
      await expect(table.getByText("API Access")).toBeVisible();
    });

    test("Pricing_faq_section", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("Questions fréquentes")).toBeVisible();
      await expect(
        page.getByText("Comment sont comptés les crédits ?")
      ).toBeVisible();
      await expect(
        page.getByText("Puis-je changer de plan à tout moment ?")
      ).toBeVisible();
    });

    test("Pricing_bottom_cta_section", async ({ page }) => {
      await page.goto("/pricing");
      await expect(
        page.getByText("Prêt à transformer votre prospection ?")
      ).toBeVisible();
      await expect(page.getByText("Créer un compte gratuit")).toBeVisible();
      await expect(page.getByText("Nous contacter")).toBeVisible();
    });

    test("Pricing_annual_savings_calculation_correct", async ({ page }) => {
      await page.goto("/pricing");
      const toggle = page.locator("button[role='switch']");
      await toggle.click();
      await expect(page.getByText("(-120€/an)")).toBeVisible();
      await expect(page.getByText("(-360€/an)")).toBeVisible();
      await expect(page.getByText("(-960€/an)")).toBeVisible();
    });

    test("Pricing_footer", async ({ page }) => {
      await page.goto("/pricing");
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer.getByText("2026 ScreenCold. Tous droits réservés.")).toBeVisible();
    });
  });

  test.describe("FAQ Page", () => {
    test("FAQ_page_header_and_title", async ({ page }) => {
      await page.goto("/faq");
      await expect(
        page.getByText("Questions fréquentes")
      ).toBeVisible();
      await expect(
        page.getByText("Tout ce que vous devez savoir sur ScreenCold")
      ).toBeVisible();
    });

    test("FAQ_10_accordion_items_rendered", async ({ page }) => {
      await page.goto("/faq");
      const detailsElements = page.locator("details");
      await expect(detailsElements).toHaveCount(10);
      await expect(
        page.getByText("Comment fonctionne ScreenCold ?")
      ).toBeVisible();
      await expect(
        page.getByText("Comment puis-je obtenir de l'aide ?")
      ).toBeVisible();
    });

    test("FAQ_accordion_default_closed", async ({ page }) => {
      await page.goto("/faq");
      const openDetails = page.locator("details[open]");
      await expect(openDetails).toHaveCount(0);
    });

    test("FAQ_accordion_open_on_click", async ({ page }) => {
      await page.goto("/faq");
      const firstDetails = page.locator("details").first();
      await firstDetails.locator("summary").click();
      await expect(firstDetails).toHaveAttribute("open", "");
    });

    test("FAQ_accordion_multiple_open_allowed", async ({ page }) => {
      await page.goto("/faq");
      const details1 = page.locator("details").nth(0);
      const details2 = page.locator("details").nth(1);
      await details1.locator("summary").click();
      await details2.locator("summary").click();
      await expect(details1).toHaveAttribute("open", "");
      await expect(details2).toHaveAttribute("open", "");
    });

    test("FAQ_accordion_close_on_click", async ({ page }) => {
      await page.goto("/faq");
      const firstDetails = page.locator("details").first();
      await firstDetails.locator("summary").click();
      await expect(firstDetails).toHaveAttribute("open", "");
      await firstDetails.locator("summary").click();
      await expect(firstDetails).not.toHaveAttribute("open", "");
    });

    test("FAQ_contact_cta_section", async ({ page }) => {
      await page.goto("/faq");
      await expect(
        page.getByText("Vous n'avez pas trouvé la réponse à votre question ?")
      ).toBeVisible();
      await expect(page.locator("a[href='/contact']")).toBeVisible();
    });

    test("FAQ_footer", async ({ page }) => {
      await page.goto("/faq");
      await expect(
        page.getByText("© 2026 ScreenCold. Tous droits réservés.")
      ).toBeVisible();
    });
  });

  test.describe("Contact Page", () => {
    test("Contact_page_renders", async ({ page }) => {
      await page.goto("/contact");
      await expect(page.getByText("Contactez-nous")).toBeVisible();
      await expect(
        page.getByText("Une question ? Un problème ? Notre équipe est là pour vous aider.")
      ).toBeVisible();
    });

    test("Contact_info_section_displays", async ({ page }) => {
      await page.goto("/contact");
      await expect(page.getByText("Email")).toBeVisible();
      await expect(page.getByText("support@screencold.com")).toBeVisible();
      await expect(page.getByText("Téléphone")).toBeVisible();
      await expect(page.getByText("Du lundi au vendredi, 9h-18h")).toBeVisible();
      await expect(page.getByText("Adresse")).toBeVisible();
      await expect(page.getByText("Paris, France")).toBeVisible();
    });

    test("Contact_form_empty_submit_shows_errors", async ({ page }) => {
      await page.goto("/contact");
      await page.getByText("Envoyer le message").click();
      await expect(page.getByText("Le nom est requis")).toBeVisible();
      await expect(page.getByText("L'email est requis")).toBeVisible();
      await expect(page.getByText("Le sujet est requis")).toBeVisible();
      await expect(page.getByText("Le message est requis")).toBeVisible();
    });

    test("Contact_form_invalid_email", async ({ page }) => {
      await page.goto("/contact");
      await page.fill('input[placeholder="Votre nom"]', "Test User");
      await page.fill('input[placeholder="votre@email.com"]', "not-an-email");
      await page.fill('input[placeholder="Sujet de votre message"]', "Test Subject");
      await page.fill("textarea", "Test message content");
      await page.getByText("Envoyer le message").click();
      await expect(page.getByText("Email invalide")).toBeVisible();
    });

    test("Contact_form_partial_fields", async ({ page }) => {
      await page.goto("/contact");
      await page.fill('input[placeholder="Votre nom"]', "Test User");
      await page.fill('input[placeholder="votre@email.com"]', "test@example.com");
      await page.getByText("Envoyer le message").click();
      await expect(page.getByText("Le sujet est requis")).toBeVisible();
      await expect(page.getByText("Le message est requis")).toBeVisible();
      await expect(page.getByText("Le nom est requis")).not.toBeVisible();
      await expect(page.getByText("L'email est requis")).not.toBeVisible();
    });

    test("Contact_form_api_error_shows_toast", async ({ page }) => {
      await page.goto("/contact");
      await page.route("**/api/contact", (route) =>
        route.fulfill({ status: 500, body: "Server error" })
      );
      await page.fill('input[placeholder="Votre nom"]', "Test User");
      await page.fill('input[placeholder="votre@email.com"]', "test@example.com");
      await page.fill('input[placeholder="Sujet de votre message"]', "Test Subject");
      await page.fill("textarea", "Test message");
      await page.getByText("Envoyer le message").click();
      await expect(
        page.getByText("Erreur lors de l'envoi du message")
      ).toBeVisible();
    });

    test("Contact_form_xss_injection", async ({ page }) => {
      await page.goto("/contact");
      const xssPayload = "<script>alert('xss')</script>";
      await page.fill('input[placeholder="Votre nom"]', xssPayload);
      await page.fill('input[placeholder="votre@email.com"]', "test@example.com");
      await page.fill('input[placeholder="Sujet de votre message"]', xssPayload);
      await page.fill("textarea", xssPayload);
      await page.route("**/api/contact", async (route) => {
        const postData = route.request().postDataJSON();
        expect(postData.name).toBe(xssPayload);
        expect(postData.message).toBe(xssPayload);
        await route.fulfill({ status: 200, body: "{}" });
      });
      await page.getByText("Envoyer le message").click();
    });
  });

  test.describe("About Page", () => {
    test("About_page_renders", async ({ page }) => {
      await page.goto("/about");
      await expect(page.getByText("À propos de ScreenCold")).toBeVisible();
    });

    test("About_mission_section", async ({ page }) => {
      await page.goto("/about");
      await expect(page.getByText("Notre mission")).toBeVisible();
    });

    test("About_history_section", async ({ page }) => {
      await page.goto("/about");
      await expect(page.getByText("Notre histoire")).toBeVisible();
      await expect(page.getByText("Fondée en 2024")).toBeVisible();
    });

    test("About_values_section", async ({ page }) => {
      await page.goto("/about");
      await expect(page.getByText("Nos valeurs")).toBeVisible();
      await expect(page.getByText("Innovation")).toBeVisible();
      await expect(page.getByText("Simplicité")).toBeVisible();
      await expect(page.getByText("Confidentialité")).toBeVisible();
      await expect(page.getByText("Efficacité")).toBeVisible();
    });

    test("About_team_section", async ({ page }) => {
      await page.goto("/about");
      await expect(page.getByText("L'équipe")).toBeVisible();
    });

    test("About_footer", async ({ page }) => {
      await page.goto("/about");
      await expect(
        page.getByText("© 2026 ScreenCold. Tous droits réservés.")
      ).toBeVisible();
    });
  });

  test.describe("Privacy Page", () => {
    test("Privacy_page_renders", async ({ page }) => {
      await page.goto("/privacy");
      await expect(
        page.getByText("Politique de confidentialité")
      ).toBeVisible();
      await expect(page.getByText("Dernière mise à jour : Mai 2026")).toBeVisible();
    });

    test("Privacy_all_10_sections_present", async ({ page }) => {
      await page.goto("/privacy");
      await expect(page.getByText("1. Responsable du traitement")).toBeVisible();
      await expect(page.getByText("2. Données collectées")).toBeVisible();
      await expect(page.getByText("3. Utilisation des données")).toBeVisible();
      await expect(page.getByText("4. Cookies et technologies similaires")).toBeVisible();
      await expect(page.getByText("5. Base légale du traitement")).toBeVisible();
      await expect(page.getByText("6. Destinataires des données")).toBeVisible();
      await expect(page.getByText("7. Conservation des données")).toBeVisible();
      await expect(page.getByText("8. Vos droits")).toBeVisible();
      await expect(page.getByText("9. Sécurité")).toBeVisible();
      await expect(page.getByText("10. Contact")).toBeVisible();
    });

    test("Privacy_cookies_subsection", async ({ page }) => {
      await page.goto("/privacy");
      await expect(
        page.getByText("Cookies strictement nécessaires")
      ).toBeVisible();
      await expect(page.getByText("Cookies analytiques")).toBeVisible();
      await expect(page.getByText("Cookies marketing")).toBeVisible();
    });

    test("Privacy_contact_email", async ({ page }) => {
      await page.goto("/privacy");
      await expect(page.locator("text=privacy@screencold.com").first()).toBeVisible();
    });

    test("Privacy_footer", async ({ page }) => {
      await page.goto("/privacy");
      await expect(
        page.getByText("© 2026 ScreenCold. Tous droits réservés.")
      ).toBeVisible();
    });
  });

  test.describe("Terms Page", () => {
    test("Terms_page_renders", async ({ page }) => {
      await page.goto("/terms");
      await expect(
        page.getByText("Conditions générales d'utilisation")
      ).toBeVisible();
      await expect(page.getByText("Dernière mise à jour : Mai 2026")).toBeVisible();
    });

    test("Terms_all_12_sections_present", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.getByText("1. Définitions")).toBeVisible();
      await expect(page.getByText("2. Objet")).toBeVisible();
      await expect(page.getByText("3. Accès au Service")).toBeVisible();
      await expect(page.getByText("4. Tarifs et paiement")).toBeVisible();
      await expect(page.getByText("5. Crédits")).toBeVisible();
      await expect(page.getByText("6. Utilisation acceptable")).toBeVisible();
      await expect(page.getByText("7. Propriété intellectuelle")).toBeVisible();
      await expect(page.getByText("8. Limitation de responsabilité")).toBeVisible();
      await expect(page.getByText("9. Résiliation")).toBeVisible();
      await expect(page.getByText("10. Modifications")).toBeVisible();
      await expect(page.getByText("11. Droit applicable et juridiction")).toBeVisible();
      await expect(page.getByText("12. Contact")).toBeVisible();
    });

    test("Terms_pricing_section_has_link", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.locator("a[href='/pricing']")).toBeVisible();
    });

    test("Terms_contact_email", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.getByText("legal@screencold.com")).toBeVisible();
    });

    test("Terms_footer", async ({ page }) => {
      await page.goto("/terms");
      await expect(
        page.getByText("© 2026 ScreenCold. Tous droits réservés.")
      ).toBeVisible();
    });
  });

  test.describe("Landing Subpages", () => {
    test("SEO_agencies_hero_section", async ({ page }) => {
      await page.goto("/agences-seo");
      await expect(
        page.getByText("Agence SEO : signez plus de clients avec")
      ).toBeVisible();
      await expect(page.getByText("Essayer gratuitement")).toBeVisible();
      await expect(page.getByText("Voir les tarifs")).toBeVisible();
      await expect(
        page.getByText("5 crédits gratuits")
      ).toBeVisible();
    });

    test("SEO_agencies_pain_points", async ({ page }) => {
      await page.goto("/agences-seo");
      await expect(
        page.getByText("Vous reconnaissez ces défis ?")
      ).toBeVisible();
      await expect(
        page.getByText("Vous passez 20+ minutes à analyser chaque prospect manuellement")
      ).toBeVisible();
    });

    test("SEO_agencies_testimonial", async ({ page }) => {
      await page.goto("/agences-seo");
      await expect(page.getByText("Thomas B.")).toBeVisible();
      await expect(
        page.getByText("Commercial, Agence SEO — Paris")
      ).toBeVisible();
    });

    test("Freelances_hero_section", async ({ page }) => {
      await page.goto("/freelances");
      await expect(
        page.getByText("Freelances : prospectez sans vous ruiner en temps")
      ).toBeVisible();
      await expect(page.getByText("Essayer gratuitement")).toBeVisible();
      await expect(
        page.getByText("Voir les tarifs (dès 29€/mois)")
      ).toBeVisible();
    });

    test("Freelances_roi_calculator", async ({ page }) => {
      await page.goto("/freelances");
      await expect(page.getByText("Le calcul est simple")).toBeVisible();
      await expect(page.getByText("20 minutes")).toBeVisible();
      await expect(page.getByText("16 heures / mois")).toBeVisible();
      await expect(page.getByText("29€ / mois")).toBeVisible();
      await expect(page.getByText("800€ / mois")).toBeVisible();
      await expect(page.getByText("x27")).toBeVisible();
    });

    test("Web_designers_hero_section", async ({ page }) => {
      await page.goto("/web-designers");
      await expect(
        page.getByText("Web designers : transformez vos audits UX en")
      ).toBeVisible();
      await expect(page.getByText("Essayer gratuitement")).toBeVisible();
      await expect(
        page.getByText("5 crédits gratuits")
      ).toBeVisible();
    });

    test("Web_designers_example_audit", async ({ page }) => {
      await page.goto("/web-designers");
      await expect(page.getByText("Exemple d'audit généré")).toBeVisible();
      await expect(page.getByText("CTA non visible")).toBeVisible();
      await expect(page.getByText("Hiérarchie visuelle")).toBeVisible();
      await expect(page.getByText("Espacement incohérent")).toBeVisible();
    });

    test("Web_designers_benefit_icons_color", async ({ page }) => {
      await page.goto("/web-designers");
      const iconContainers = page.locator("div.rounded-lg.bg-purple-100");
      const count = await iconContainers.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Blog Page", () => {
    test("Blog_page_renders", async ({ page }) => {
      await page.goto("/blog");
      await expect(page.getByText("Blog")).toBeVisible();
      await expect(
        page.getByText("Conseils, statistiques et bonnes pratiques")
      ).toBeVisible();
    });

    test("Blog_category_filter_buttons", async ({ page }) => {
      await page.goto("/blog");
      await expect(page.getByText("Tous")).toBeVisible();
      await expect(page.getByText("Cold Outreach")).toBeVisible();
      await expect(page.getByText("UX Design")).toBeVisible();
      await expect(page.getByText("CRO")).toBeVisible();
      await expect(page.getByText("Productivité")).toBeVisible();
      await expect(page.getByText("Industry")).toBeVisible();
    });

    test("Blog_featured_article_displayed", async ({ page }) => {
      await page.goto("/blog");
      await expect(page.getByText("Article à la une")).toBeVisible();
      await expect(
        page.getByText("Cold Outreach en 2026")
      ).toBeVisible();
      await expect(page.getByText("8 min de lecture")).toBeVisible();
    });

    test("Blog_articles_grid", async ({ page }) => {
      await page.goto("/blog");
      const articleLinks = page.locator("a[href^='/blog/']");
      const count = await articleLinks.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test("Blog_category_filter_click", async ({ page }) => {
      await page.goto("/blog");
      await page.getByText("UX Design").click();
      await expect(page).toHaveURL(/category=ux-design/);
      await expect(
        page.getByText("La checklist UX ultime")
      ).toBeVisible();
    });

    test("Blog_category_all_click", async ({ page }) => {
      await page.goto("/blog?category=ux-design");
      await page.getByText("Tous").click();
      await expect(page).toHaveURL(/\/blog$/);
    });

    test("Blog_article_card_links_to_detail", async ({ page }) => {
      await page.goto("/blog");
      const articleLink = page.locator("a[href^='/blog/']").first();
      const href = await articleLink.getAttribute("href");
      await articleLink.click();
      await expect(page).toHaveURL(href);
    });

    test("Blog_footer", async ({ page }) => {
      await page.goto("/blog");
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(
        footer.getByText("© 2026 ScreenCold. Tous droits réservés.")
      ).toBeVisible();
    });
  });
});
