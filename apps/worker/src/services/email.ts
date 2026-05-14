import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "../utils/logger";
import type { EmailResult } from "@screencold/types";

const logger = createLogger();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

// System prompt for email generation
const EMAIL_SYSTEM_PROMPT = `You are an expert copywriter specializing in cold emails for B2B sales. Your task is to generate personalized, effective cold emails based on UX audit findings.

Guidelines:
- Keep emails short and impactful (under 150 words total)
- Start with a hook that references a specific issue from the audit
- Show empathy and understanding of the prospect's challenges
- Offer concrete value (the specific fix or improvement)
- Include a clear, single call-to-action
- Use professional but conversational tone
- Never be pushy or aggressive
- Reference specific elements from their website (headline, CTA, layout, etc.)

Email structure:
1. Subject line (compelling, personalized)
2. Opening (hook referencing their site)
3. Body (brief problem → solution → value)
4. P.S. (optional extra value or social proof)
5. Signature (keep minimal)

Output format (JSON):
{
  "subject": "email subject line",
  "body": "full email body with line breaks",
  "ps": "optional P.S. text",
  "tone": "formal|conversational|professional"
}`;

interface GenerateEmailParams {
  auditId: string;
  url: string;
  issues: unknown[];
  contactName?: string;
  customMessage?: string;
}

export async function generateEmail(
  params: GenerateEmailParams
): Promise<EmailResult> {
  const { auditId, url, issues, contactName, customMessage } = params;

  try {
    logger.info("Generating email", { auditId, url });

    // Format issues for the prompt
    const issuesText = Array.isArray(issues) && issues.length > 0
      ? issues
          .slice(0, 5) // Limit to top 5 issues
          .map((issue, idx) => {
            if (typeof issue === "object" && issue !== null) {
              const i = issue as Record<string, unknown>;
              return `${idx + 1}. ${i.title ?? "Issue"}: ${i.description ?? ""} (${i.severity ?? "minor"})`;
            }
            return `${idx + 1}. ${String(issue)}`;
          })
          .join("\n")
      : "General UX improvements recommended";

    const personalization = contactName
      ? `\n\nPersonal context: Contact name is ${contactName}`
      : "";

    const customContext = customMessage
      ? `\n\nCustom message from user: ${customMessage}`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-opus-4-20251114",
      max_tokens: 2048,
      system: EMAIL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a personalized cold email for outreach.

Website URL: ${url}
URL Domain: ${extractDomain(url)}

Key UX Issues Found:
${issuesText}
${personalization}
${customContext}

Remember:
- Subject line should reference their specific situation
- Keep it under 150 words
- Make it personal and relevant
- Focus on one main improvement
- Include a clear call-to-action`,
        },
      ],
    });

    // Parse the response
    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    // Try to parse as JSON
    let emailData;
    try {
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
        responseText.match(/```\n?([\s\S]*?)\n?```/) ||
        responseText.match(/(\{[\s\S]*\})/);

      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      emailData = JSON.parse(jsonString);
    } catch {
      // If JSON parsing fails, create structured email from text
      logger.warn("Failed to parse email response as JSON");
      emailData = {
        subject: `Amélioration UX pour ${extractDomain(url)}`,
        body: responseText,
        ps: undefined,
        tone: "professional",
      };
    }

    logger.info("Email generated successfully", { auditId });

    return {
      success: true,
      subject: emailData.subject ?? `Amélioration UX pour ${extractDomain(url)}`,
      body: emailData.body ?? responseText,
      ps: emailData.ps,
      tone: emailData.tone ?? "professional",
      personalization: {
        companyName: extractDomain(url),
        contactName: contactName ?? undefined,
        issueHighlight: Array.isArray(issues) && issues.length > 0
          ? (issues[0] as Record<string, unknown>)?.title?.toString() ?? undefined
          : undefined,
      },
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Email generation failed", { error: errorMessage });

    return {
      success: false,
      subject: "",
      body: "",
      tone: "professional",
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
}

// Helper to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// Batch email generation
export async function generateMultipleEmails(
  params: GenerateEmailParams[]
): Promise<EmailResult[]> {
  return await Promise.all(
    params.map((p) => generateEmail(p))
  );
}

export default anthropic;