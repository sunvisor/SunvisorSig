import type { WebhookEndpointType, WebhookEventType } from "@prisma/client";

export const webhookTypeOptions: Array<{
  value: WebhookEndpointType;
  label: string;
  description: string;
}> = [
  { value: "SLACK", label: "Slack", description: "Incoming Webhook" },
  { value: "DISCORD", label: "Discord", description: "Webhook URL" },
  { value: "TEAMS", label: "Microsoft Teams", description: "Workflows Webhook" },
  { value: "GOOGLE_CHAT", label: "Google Chat", description: "Incoming Webhook" },
];

export const webhookEventOptions: Array<{
  value: WebhookEventType;
  label: string;
  description: string;
}> = [
  { value: "POST_CREATED", label: "投稿作成", description: "新しい投稿が作成されたとき" },
  { value: "COMMENT_CREATED", label: "コメント作成", description: "投稿にコメントが付いたとき" },
  { value: "MENTIONED", label: "メンション", description: "@メンションが含まれていたとき" },
  { value: "STATUS_CHANGED", label: "状態変更", description: "投稿状態が変更されたとき" },
];

export function getWebhookTypeLabel(type: WebhookEndpointType) {
  return webhookTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function getWebhookEventLabel(eventType: WebhookEventType) {
  return webhookEventOptions.find((option) => option.value === eventType)?.label ?? eventType;
}

export function isWebhookEventType(value: string): value is WebhookEventType {
  return webhookEventOptions.some((option) => option.value === value);
}

export function isWebhookEndpointType(value: string): value is WebhookEndpointType {
  return webhookTypeOptions.some((option) => option.value === value);
}

export function maskWebhookUrl(webhookUrl: string) {
  try {
    const url = new URL(webhookUrl);
    const visibleSuffix = url.pathname.slice(-10);

    return `${url.origin}/...${visibleSuffix}`;
  } catch {
    const visibleSuffix = webhookUrl.slice(-12);
    return `***${visibleSuffix}`;
  }
}
