/**
 * Slack Alert Module
 *
 * Sends structured alert messages to a Slack channel via Incoming Webhook.
 * Uses native fetch — no additional dependencies.
 *
 * Gracefully fails (logs error, returns false) if the webhook URL is
 * missing or the request fails.
 */

export interface SlackAttachment {
  color?: "good" | "warning" | "danger" | string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  ts?: number;
}

export interface SlackMessage {
  text: string;
  attachments?: SlackAttachment[];
}

/**
 * Post a message to the Slack webhook configured via SLACK_WEBHOOK_URL.
 *
 * Returns true if the message was delivered successfully (HTTP 2xx),
 * false otherwise. Errors are logged to console.error but never thrown.
 */
export async function sendSlackAlert(message: SlackMessage): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("[SlackAlert] SLACK_WEBHOOK_URL is not configured");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        `[SlackAlert] Webhook responded with ${response.status}: ${response.statusText}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "[SlackAlert] Failed to send alert:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
