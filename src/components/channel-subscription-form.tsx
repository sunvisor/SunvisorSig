"use client";

import { useActionState } from "react";
import { Bell, BellOff } from "lucide-react";
import type { FormActionState } from "@/lib/action-state";
import { ui } from "@/lib/ui-classes";

type ChannelSubscriptionFormProps = Readonly<{
  forumId: string;
  channelId: string;
  subscribed: boolean;
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  initialState: FormActionState;
}>;

export function ChannelSubscriptionForm({
  forumId,
  channelId,
  subscribed,
  action,
  initialState,
}: ChannelSubscriptionFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-2">
      <input name="forumId" type="hidden" value={forumId} />
      <input name="channelId" type="hidden" value={channelId} />
      <button
        className={subscribed ? ui.button.secondary : ui.button.primary}
        type="submit"
      >
        {subscribed ? <BellOff aria-hidden="true" size={16} /> : <Bell aria-hidden="true" size={16} />}
        <span>{subscribed ? "購読を解除" : "チャンネルを購読"}</span>
      </button>
      <p className={ui.text.body}>
        購読すると、このチャンネルで新しい投稿やコメントがあったときに通知します。
      </p>
      {state.message ? (
        <p className="text-sm font-medium text-rose-700">{state.message}</p>
      ) : null}
    </form>
  );
}
