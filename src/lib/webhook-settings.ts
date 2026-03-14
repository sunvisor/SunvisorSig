import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit-log";
import { initialFormActionState, type FormActionState } from "@/lib/action-state";
import { AppError, isAppError } from "@/lib/app-error";
import { requireSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWebhookTestMessage } from "@/lib/webhook-delivery";
import { isWebhookEndpointType, isWebhookEventType } from "@/lib/webhook-endpoints";

export const initialWebhookActionState = initialFormActionState;

function parseEvents(formData: FormData) {
  const values = formData.getAll("events").map((value) => String(value));
  const events = values.filter(isWebhookEventType);

  if (events.length === 0) {
    throw new AppError("INVALID_INPUT", "通知イベントを1つ以上選択してください。");
  }

  return events;
}

function normalizeWebhookUrl(value: FormDataEntryValue | null) {
  const webhookUrl = String(value ?? "").trim();

  if (!webhookUrl) {
    throw new AppError("INVALID_INPUT", "Webhook URL を入力してください。");
  }

  try {
    const url = new URL(webhookUrl);

    if (!["https:"].includes(url.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new AppError("INVALID_INPUT", "Webhook URL の形式が不正です。");
  }

  return webhookUrl;
}

export async function getWebhookEndpoints() {
  return prisma.webhookEndpoint.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdByUser: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });
}

export async function getForumWebhookEndpoints(forumId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { forumId },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdByUser: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });
}

export async function createWebhookEndpoint(formData: FormData) {
  "use server";

  const currentUser = await requireSystemAdmin();
  const forumId = String(formData.get("forumId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const typeValue = String(formData.get("type") ?? "");
  const webhookUrl = normalizeWebhookUrl(formData.get("webhookUrl"));
  const events = parseEvents(formData);

  if (!forumId || !name || !isWebhookEndpointType(typeValue)) {
    throw new AppError("INVALID_INPUT", "必須項目が不足しています。");
  }

  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: { id: true, name: true },
  });

  if (!forum) {
    throw new AppError("INVALID_INPUT", "対象のフォーラムが見つかりません。");
  }

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      forumId,
      name,
      type: typeValue,
      webhookUrl,
      events,
      createdByUserId: currentUser.id,
    },
  });

  await createAuditLog({
    actorUserId: currentUser.id,
    actionType: "WEBHOOK_CREATED",
    targetType: "WEBHOOK",
    targetId: endpoint.id,
    targetLabel: endpoint.name,
    metadata: {
      type: endpoint.type,
      events: endpoint.events,
      enabled: endpoint.enabled,
      forumId,
    },
  });

  revalidatePath(`/forums/${forumId}/settings`);
  redirect(`/forums/${forumId}/settings` as Route);
}

export async function createWebhookEndpointAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await createWebhookEndpoint(formData);
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }

  return initialFormActionState;
}

async function getEndpointOrThrow(id: string) {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    include: {
      forum: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!endpoint) {
    throw new AppError("INVALID_INPUT", "Webhook 設定が見つかりません。");
  }

  return endpoint;
}

export async function toggleWebhookEndpoint(formData: FormData) {
  "use server";

  const currentUser = await requireSystemAdmin();
  const endpointId = String(formData.get("endpointId") ?? "");

  if (!endpointId) {
    throw new AppError("INVALID_INPUT", "対象の Webhook が指定されていません。");
  }

  const endpoint = await getEndpointOrThrow(endpointId);
  const updated = await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: {
      enabled: !endpoint.enabled,
    },
  });

  await createAuditLog({
    actorUserId: currentUser.id,
    actionType: "WEBHOOK_UPDATED",
    targetType: "WEBHOOK",
    targetId: updated.id,
    targetLabel: updated.name,
    metadata: {
      enabled: updated.enabled,
      events: updated.events,
      type: updated.type,
    },
  });

  revalidatePath(`/forums/${endpoint.forum.id}/settings`);
}

export async function toggleWebhookEndpointAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await toggleWebhookEndpoint(formData);

    return {
      ok: true,
      message: "Webhook 設定を更新しました。",
    };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }
}

export async function deleteWebhookEndpoint(formData: FormData) {
  "use server";

  const currentUser = await requireSystemAdmin();
  const endpointId = String(formData.get("endpointId") ?? "");

  if (!endpointId) {
    throw new AppError("INVALID_INPUT", "対象の Webhook が指定されていません。");
  }

  const endpoint = await getEndpointOrThrow(endpointId);
  await prisma.webhookEndpoint.delete({
    where: { id: endpoint.id },
  });

  await createAuditLog({
    actorUserId: currentUser.id,
    actionType: "WEBHOOK_DELETED",
    targetType: "WEBHOOK",
    targetId: endpoint.id,
    targetLabel: endpoint.name,
    metadata: {
      type: endpoint.type,
      events: endpoint.events,
    },
  });

  revalidatePath(`/forums/${endpoint.forum.id}/settings`);
}

export async function deleteWebhookEndpointAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await deleteWebhookEndpoint(formData);

    return {
      ok: true,
      message: "Webhook 設定を削除しました。",
    };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }
}

export async function testWebhookEndpoint(formData: FormData) {
  "use server";

  const currentUser = await requireSystemAdmin();
  const endpointId = String(formData.get("endpointId") ?? "");

  if (!endpointId) {
    throw new AppError("INVALID_INPUT", "対象の Webhook が指定されていません。");
  }

  const endpoint = await getEndpointOrThrow(endpointId);
  await sendWebhookTestMessage(endpoint);

  await createAuditLog({
    actorUserId: currentUser.id,
    actionType: "WEBHOOK_TESTED",
    targetType: "WEBHOOK",
    targetId: endpoint.id,
    targetLabel: endpoint.name,
    metadata: {
      type: endpoint.type,
      forumId: endpoint.forum.id,
    },
  });
}

export async function testWebhookEndpointAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  "use server";

  try {
    await testWebhookEndpoint(formData);

    return {
      ok: true,
      message: "テスト送信を実行しました。",
    };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      code: "WEBHOOK_DELIVERY_FAILED",
      message: "Webhook のテスト送信に失敗しました。",
    };
  }
}
