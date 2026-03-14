import type { WebhookEndpoint, WebhookEndpointType, WebhookEventType } from "@prisma/client";
import { getAppUrl } from "@/lib/app-url";
import { AppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";

export type WebhookEventPayload = {
  type: WebhookEventType | "TEST_MESSAGE";
  title: string;
  summary: string;
  actorDisplayName: string;
  forumName: string;
  channelName?: string;
  postTitle?: string;
  href?: string;
};

function getAbsoluteUrl(href?: string) {
  if (!href) {
    return null;
  }

  return `${getAppUrl()}${href.startsWith("/") ? href : `/${href}`}`;
}

export function formatWebhookText(event: WebhookEventPayload) {
  const lines = [event.title, event.summary, "", `フォーラム: ${event.forumName}`];

  if (event.channelName) {
    lines.push(`チャンネル: ${event.channelName}`);
  }

  if (event.postTitle) {
    lines.push(`投稿: ${event.postTitle}`);
  }

  lines.push(`実行者: ${event.actorDisplayName}`);

  const absoluteUrl = getAbsoluteUrl(event.href);
  if (absoluteUrl) {
    lines.push(`URL: ${absoluteUrl}`);
  }

  return lines.join("\n");
}

export function buildWebhookRequest(
  endpointType: WebhookEndpointType,
  event: WebhookEventPayload,
) {
  const absoluteUrl = getAbsoluteUrl(event.href);
  const text = formatWebhookText(event);

  switch (endpointType) {
    case "SLACK":
      return {
        body: {
          text,
        },
      };
    case "DISCORD":
      return {
        body: {
          content: text,
        },
      };
    case "GOOGLE_CHAT":
      return {
        body: {
          text,
        },
      };
    case "TEAMS":
      return {
        body: {
          type: "message",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              contentUrl: null,
              content: {
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                type: "AdaptiveCard",
                version: "1.4",
                body: [
                  {
                    type: "TextBlock",
                    text: event.title,
                    weight: "Bolder",
                    size: "Medium",
                    wrap: true,
                  },
                  {
                    type: "TextBlock",
                    text: event.summary,
                    wrap: true,
                  },
                  {
                    type: "FactSet",
                    facts: [
                      { title: "フォーラム", value: event.forumName },
                      ...(event.channelName
                        ? [{ title: "チャンネル", value: event.channelName }]
                        : []),
                      ...(event.postTitle ? [{ title: "投稿", value: event.postTitle }] : []),
                      { title: "実行者", value: event.actorDisplayName },
                    ],
                  },
                  ...(absoluteUrl
                    ? [
                        {
                          type: "TextBlock",
                          text: absoluteUrl,
                          wrap: true,
                        },
                      ]
                    : []),
                ],
              },
            },
          ],
        },
      };
  }
}

async function postWebhook(endpoint: Pick<WebhookEndpoint, "type" | "webhookUrl">, event: WebhookEventPayload) {
  const request = buildWebhookRequest(endpoint.type, event);
  const response = await fetch(endpoint.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.body),
  });

  if (!response.ok) {
    throw new AppError(
      "WEBHOOK_DELIVERY_FAILED",
      `Webhook delivery failed with status ${response.status}.`,
    );
  }
}

export async function sendWebhookTestMessage(endpoint: Pick<WebhookEndpoint, "type" | "webhookUrl">) {
  await postWebhook(endpoint, {
    type: "TEST_MESSAGE",
    title: "Webhook テスト送信",
    summary: "SunvisorSig からのテスト通知です。",
    actorDisplayName: "System",
    forumName: "管理者設定",
  });
}

export async function deliverWebhookEvent(event: WebhookEventPayload) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      enabled: true,
      events: {
        has: event.type as WebhookEventType,
      },
    },
    select: {
      id: true,
      type: true,
      webhookUrl: true,
    },
  });

  await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        await postWebhook(endpoint, event);
      } catch (error) {
        console.error("[webhook-delivery]", endpoint.id, error);
      }
    }),
  );
}

