import type { Route } from "next";
import { PrimaryLink } from "@/components/forum-ui";
import { SubmitButton } from "@/components/submit-button";
import { forumThemePresets } from "@/lib/forum-theme";
import { ui } from "@/lib/ui-classes";

type ForumFormProps = Readonly<{
  action: (formData: FormData) => Promise<void>;
  cancelHref: Route;
  submitLabel: string;
  admins: Array<{
    id: string;
    displayName: string;
  }>;
  initialValues?: {
    id?: string;
    name?: string;
    description?: string | null;
    createdByUserId?: string;
    themeName?: string;
  };
}>;

export function ForumForm({
  action,
  cancelHref,
  submitLabel,
  admins,
  initialValues,
}: ForumFormProps) {
  const defaultAdminId = initialValues?.createdByUserId ?? admins[0]?.id ?? "";
  const defaultThemeName = initialValues?.themeName ?? forumThemePresets[1].themeName;

  return (
    <form action={action} className={ui.form.layout}>
      {initialValues?.id ? <input name="forumId" type="hidden" value={initialValues.id} /> : null}
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="name">
          フォーラム名
        </label>
        <input
          className={ui.form.input}
          defaultValue={initialValues?.name ?? ""}
          id="name"
          name="name"
          placeholder="例: Acme 導入フォーラム"
          required
          type="text"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="description">
          説明
        </label>
        <textarea
          className={`${ui.form.textarea} min-h-36`}
          defaultValue={initialValues?.description ?? ""}
          id="description"
          name="description"
          placeholder="このフォーラムで扱う内容を入力してください。"
        />
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="createdByUserId">
          管理者
        </label>
        <select
          className={ui.form.select}
          defaultValue={defaultAdminId}
          id="createdByUserId"
          name="createdByUserId"
          required
        >
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className={ui.form.group}>
        <label className={ui.text.label} htmlFor="themeName">
          カラーテーマ
        </label>
        <select
          className={ui.form.select}
          defaultValue={defaultThemeName}
          id="themeName"
          name="themeName"
          required
        >
          {forumThemePresets.map((preset) => (
            <option key={preset.themeName} value={preset.themeName}>
              {preset.themeName}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {forumThemePresets.map((preset) => (
          <div
            key={preset.themeName}
            className={`${ui.surface.mutedCard} flex flex-col gap-3 p-4`}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: preset.themeAccent }}
              />
              <p className="theme-text text-sm font-medium">{preset.themeName}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                preset.themeAccent,
                preset.themeAccentSoft,
                preset.themeSurface,
                preset.themeSurfaceMuted,
              ].map((color) => (
                <span
                  key={color}
                  className="h-8 rounded-xl border"
                  style={{ backgroundColor: color, borderColor: preset.themeBorder }}
                />
              ))}
            </div>
            <p className={ui.text.body}>
              Accent {preset.themeAccent}
            </p>
          </div>
        ))}
      </div>
      <div className={ui.form.actions}>
        <SubmitButton>{submitLabel}</SubmitButton>
        <PrimaryLink href={cancelHref}>キャンセル</PrimaryLink>
      </div>
    </form>
  );
}
