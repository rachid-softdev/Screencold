import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "../utils/logger";
import type { AnalyzeResult, UXIssue, IssueSeverity, IssueCategory } from "@screencold/types";

const logger = createLogger();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

// System prompt for UX analysis
const ANALYSIS_SYSTEM_PROMPT = `You are an expert UX consultant specializing in analyzing SaaS websites and landing pages. Your task is to:

1. Analyze the provided screenshots of a website
2. Identify critical UX issues that negatively impact conversion
3. Provide actionable recommendations

Focus on these key areas:
- Clear value proposition and headline
- Trust signals (social proof, logos, testimonials)
- Call-to-action visibility and prominence
- Form design and friction
- Mobile responsiveness
- Page load perception
- Visual hierarchy and readability

Rate each issue by severity: critical, major, or minor

Provide your analysis in JSON format with the following structure:
{
  "overallScore": 0-100,
  "siteType": "description of site type",
  "summary": "brief overall assessment",
  "strengths": ["list of what's working well"],
  "recommendations": ["list of actionable recommendations"],
  "issues": [
    {
      "type": "issue_type",
      "severity": "critical|major|minor",
      "category": "navigation|layout|typography|color|cta|trust|mobile|performance|accessibility",
      "title": "concise issue title",
      "description": "detailed explanation",
      "recommendation": "specific fix recommendation",
      "zone": {
        "x": 0-100 (percentage),
        "y": 0-100 (percentage),
        "width": 0-100,
        "height": 0-100,
        "elementSelector": "css selector if identifiable"
      }
    }
  ]
}`;

interface AnalyzeWithAIOptions {
  pageUrl?: string;
  screenshotBase64?: string;
  mobileScreenshotBase64?: string;
  annotatedScreenshotBase64?: string;
}

export async function analyzeWithAI(
  screenshotUrl: string,
  options: AnalyzeWithAIOptions = {}
): Promise<AnalyzeResult> {
  const startTime = Date.now();
  const { pageUrl, screenshotBase64, mobileScreenshotBase64, annotatedScreenshotBase64 } = options;

  try {
    logger.info("Analyzing website with Claude AI", { pageUrl });

    // Build the content array with text and images
    const content: Anthropic.MessageParam[] = [];

    // Add text prompt
    content.push({
      type: "text" as const,
      text: `Please analyze this website${pageUrl ? ` (${pageUrl})` : ""}. Provide detailed UX findings with specific issues and recommendations. Include a score from 0-100 where 100 is perfect UX. Look at both desktop and mobile screenshots if provided.`,
    });

    // Add desktop screenshot if provided
    if (screenshotBase64) {
      content.push({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: "image/png" as const,
          data: screenshotBase64,
        },
      });
    }

    // Add mobile screenshot if provided
    if (mobileScreenshotBase64) {
      content.push({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: "image/png" as const,
          data: mobileScreenshotBase64,
        },
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-opus-4-20251114",
      max_tokens: 4096,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // Parse the response
    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    // Try to parse as JSON
    let analysisData;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
        responseText.match(/```\n?([\s\S]*?)\n?```/) ||
        responseText.match(/(\{[\s\S]*\})/);

      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      analysisData = JSON.parse(jsonString);
    } catch {
      // If JSON parsing fails, create a structured response from text
      logger.warn("Failed to parse AI response as JSON, using text analysis");
      analysisData = {
        overallScore: 70,
        siteType: "Unknown (analysis partial)",
        summary: responseText.slice(0, 500),
        strengths: [],
        recommendations: responseText.split(". ").slice(0, 5),
        issues: [],
      };
    }

    // Transform issues to match our type
    const issues: UXIssue[] = (analysisData.issues ?? []).map((issue: {
      type: string;
      severity: string;
      category: string;
      title: string;
      description: string;
      recommendation: string;
      zone?: { x: number; y: number; width: number; height: number; elementSelector?: string };
    }) => ({
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: issue.type,
      severity: issue.severity as IssueSeverity,
      category: issue.category as IssueCategory,
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
      zone: issue.zone,
      screenshotUrl: annotatedScreenshotBase64 ? "annotated" : undefined,
    }));

    const analysisTime = Date.now() - startTime;

    logger.info("AI analysis completed", {
      score: analysisData.overallScore,
      issuesFound: issues.length,
      analysisTime,
    });

    return {
      success: true,
      issues,
      overallScore: analysisData.overallScore ?? 70,
      siteType: analysisData.siteType ?? "Website",
      summary: analysisData.summary ?? "Analysis completed",
      strengths: analysisData.strengths ?? [],
      recommendations: analysisData.recommendations ?? [],
      timestamp: new Date().toISOString(),
      metadata: {
        model: "claude-opus-4-20251114",
        tokensUsed: message.usage?.input_tokens ?? 0,
        analysisTime,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("AI analysis failed", { error: errorMessage });

    return {
      success: false,
      issues: [],
      overallScore: 0,
      siteType: "Unknown",
      summary: "Analysis failed",
      strengths: [],
      recommendations: [],
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
}

// Batch analysis for multiple screenshots
export async function analyzeMultiple(
  screenshots: Array<{ url: string; pageUrl?: string }>
): Promise<AnalyzeResult[]> {
  return await Promise.all(
    screenshots.map((screenshot) =>
      analyzeWithAI(screenshot.url, { pageUrl: screenshot.pageUrl })
    )
  );
}

export default anthropic;