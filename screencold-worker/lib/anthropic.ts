/**
 * Anthropic Claude Client
 * Handles vision analysis and email generation using Claude Sonnet 4
 */

import Anthropic from "@anthropic-ai/sdk";

// Initialize the client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  timeout: 60_000,
});

/**
 * Issue severity levels
 */
export type Severity = "HIGH" | "MEDIUM" | "LOW";

/**
 * Issue category
 */
export type Category =
  | "CTA"
  | "SOCIAL_PROOF"
  | "HERO"
  | "FORM"
  | "MOBILE"
  | "SPEED"
  | "COPY"
  | "TRUST"
  | "NAVIGATION"
  | "SPACING";

/**
 * Zone coordinates from AI analysis
 */
export interface IssueZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * UX Issue from AI analysis
 */
export interface UXIssue {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  suggestion: string;
  zone: IssueZone;
}

/**
 * Analysis result from Claude Vision
 */
export interface AnalyzeResult {
  siteType: string;
  overallScore: number;
  issues: UXIssue[];
  strengths: string[];
}

/**
 * Email context for generation
 */
export interface EmailContext {
  agencyType: "Design" | "CRO" | "SEO" | "Dev" | "Branding";
  contactName: string;
  companyName: string;
  url: string;
  primaryIssue: string;
  overallScore: number;
  annotatedImageUrl: string;
}

/**
 * Generated email result
 */
export interface EmailResult {
  subject: string;
  body: string;
  ps?: string;
}

/**
 * System prompt for UX analysis
 */
const ANALYSIS_SYSTEM_PROMPT = `Tu es un expert CRO (Conversion Rate Optimization) et UX senior.
Tu analyses des screenshots de sites web pour des agences de design et de conversion.
Tu dois identifier des problèmes concrets, précis et actionnables.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.`;

/**
 * User prompt for UX analysis
 */
function createAnalysisUserPrompt(
  screenshot: Buffer,
  companyName?: string
): string {
  const base64Image = screenshot.toString("base64");

  let prompt = `Analyse ce screenshot de site web (desktop).
Le site appartient à : ${companyName || "inconnu"}
Type de site : [détecte automatiquement : landing page, e-commerce, SaaS, portfolio, etc.]

Identifie entre 3 et 5 problèmes UX/conversion prioritaires.

Réponds avec ce JSON exact :
{
  "siteType": "string",
  "overallScore": number (0-100, score de conversion estimé),
  "issues": [
    {
      "id": "string unique",
      "category": "CTA|SOCIAL_PROOF|HERO|FORM|MOBILE|SPEED|COPY|TRUST|NAVIGATION|SPACING",
      "severity": "HIGH|MEDIUM|LOW",
      "title": "string court (max 8 mots)",
      "description": "string précis et contextuel (max 40 mots)",
      "suggestion": "string actionnable (max 30 mots)",
      "zone": {
        "x": number (% de 0 à 100 depuis la gauche),
        "y": number (% de 0 à 100 depuis le haut),
        "width": number (% de largeur),
        "height": number (% de hauteur)
      }
    }
  ],
  "strengths": ["string", "string"]
}`;

  return prompt;
}

/**
 * Parses the JSON response from Claude
 */
function parseAnalyzeResponse(response: string): AnalyzeResult {
  // Try to extract JSON from markdown code blocks or plain text
  let jsonString = response.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }

  // Also handle if response is directly JSON without markdown
  const directJsonMatch = jsonString.match(/^\s*\{[\s\S]*\}\s*$/);
  if (directJsonMatch) {
    jsonString = jsonString.trim();
  }

  const parsed = JSON.parse(jsonString);

  // Validate and normalize the response
  return {
    siteType: parsed.siteType || "Unknown",
    overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
    issues: (parsed.issues || []).map((issue: Record<string, unknown>) => ({
      id: issue.id || `issue-${Date.now()}`,
      category: issue.category || "SPACING",
      severity: issue.severity || "LOW",
      title: issue.title || "Issue détectée",
      description: issue.description || "",
      suggestion: issue.suggestion || "",
      zone: {
        x: Math.min(100, Math.max(0, Number((issue.zone as Record<string, unknown>)?.x) || 0)),
        y: Math.min(100, Math.max(0, Number((issue.zone as Record<string, unknown>)?.y) || 0)),
        width: Math.min(100, Math.max(0, Number((issue.zone as Record<string, unknown>)?.width) || 10)),
        height: Math.min(100, Math.max(0, Number((issue.zone as Record<string, unknown>)?.height) || 10)),
      },
    })),
    strengths: parsed.strengths || [],
  };
}

/**
 * Analyzes a screenshot using Claude Vision
 * @param buffer - The screenshot buffer (PNG)
 * @param companyName - Optional company name for context
 * @returns The analysis result
 */
export async function analyzeScreenshot(
  buffer: Buffer,
  companyName?: string
): Promise<AnalyzeResult> {
  const base64Image = buffer.toString("base64");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: createAnalysisUserPrompt(buffer, companyName),
            },
          ],
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find(
      (c) => c.type === "text"
    ) as { type: "text"; text: string } | undefined;

    if (!textContent?.text) {
      throw new Error("No text response from Claude");
    }

    return parseAnalyzeResponse(textContent.text);
  } catch (error) {
    // Retry once on parse failure
    if (error instanceof SyntaxError) {
      console.error(
        "Failed to parse Claude response, retrying once...",
        error
      );

      // Wait a bit before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: buffer.toString("base64"),
                },
              },
              {
                type: "text",
                text: createAnalysisUserPrompt(buffer, companyName),
              },
            ],
          },
        ],
      });

      const retryContent = retryResponse.content.find(
        (c) => c.type === "text"
      ) as { type: "text"; text: string } | undefined;

      if (retryContent?.text) {
        return parseAnalyzeResponse(retryContent.text);
      }
    }

    throw error;
  }
}

/**
 * System prompt for email generation
 */
const EMAIL_SYSTEM_PROMPT = `Tu es un expert en cold outreach B2B.
Tu rédiges des emails de prospection courts, personnalisés et qui convertissent.
L'email doit sembler écrit manuellement par un humain, pas par un outil.
Ton : direct, professionnel mais humain, pas trop formel.
Longueur : 100-150 mots maximum.`;

/**
 * User prompt for email generation
 */
function createEmailUserPrompt(ctx: EmailContext): string {
  return `Génère un email de prospection pour le contexte suivant :

- Expéditeur : ${ctx.agencyType}
- Destinataire : ${ctx.contactName} de ${ctx.companyName}
- URL analysée : ${ctx.url}
- Problème principal détecté : ${ctx.primaryIssue}
- Score de conversion estimé : ${ctx.overallScore}/100
- Image annotée : ${ctx.annotatedImageUrl}

L'email doit :
- Mentionner le site spécifique (pas générique)
- Décrire LE problème précis observé (pas "votre site a des problèmes")
- Inclure une ligne pour coller l'image annotée : [IMAGE_PLACEHOLDER]
- Terminer par un CTA doux (pas "booker un appel", plutôt "3 idées à vous partager")

Réponds avec ce JSON exact :
{
  "subject": "string (max 50 chars, pas de emoji, pas de majuscules excessives)",
  "body": "string (email complet avec sauts de ligne \\n)",
  "ps": "string optionnel (accroche supplémentaire)"
}`;
}

/**
 * Parses the email generation response
 */
function parseEmailResponse(response: string): EmailResult {
  let jsonString = response.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonString);

  return {
    subject: parsed.subject || "Vos idées pour améliorer votre site",
    body: parsed.body || "",
    ps: parsed.ps,
  };
}

/**
 * Generates a personalized outreach email
 * @param ctx - Email context with all necessary information
 * @returns The generated email
 */
export async function generateEmail(ctx: EmailContext): Promise<EmailResult> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: EMAIL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: createEmailUserPrompt(ctx),
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(
      (c) => c.type === "text"
    ) as { type: "text"; text: string } | undefined;

    if (!textContent?.text) {
      throw new Error("No text response from Claude");
    }

    return parseEmailResponse(textContent.text);
  } catch (error) {
    // Retry once on failure
    if (error instanceof SyntaxError) {
      console.error(
        "Failed to parse email response, retrying once...",
        error
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: EMAIL_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: createEmailUserPrompt(ctx),
              },
            ],
          },
        ],
      });

      const retryContent = retryResponse.content.find(
        (c) => c.type === "text"
      ) as { type: "text"; text: string } | undefined;

      if (retryContent?.text) {
        return parseEmailResponse(retryContent.text);
      }
    }

    throw error;
  }
}