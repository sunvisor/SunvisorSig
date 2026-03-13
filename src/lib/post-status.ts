export const postStatusOptions = [
  { value: "", label: "状態管理なし" },
  { value: "TODO", label: "未対応" },
  { value: "IN_PROGRESS", label: "対応中" },
  { value: "DONE", label: "完了" },
] as const;

export const postStatusFilterOptions = [
  { value: "", label: "すべての状態" },
  { value: "NONE", label: "状態なし" },
  { value: "TODO", label: "未対応" },
  { value: "IN_PROGRESS", label: "対応中" },
  { value: "DONE", label: "完了" },
] as const;

export function getPostStatusLabel(status: string | null | undefined) {
  const matched = postStatusOptions.find((option) => option.value === (status ?? ""));
  return matched?.label ?? "状態管理なし";
}

export function getPostStatusTone(status: string | null | undefined) {
  if (status === "TODO") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "IN_PROGRESS") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (status === "DONE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}
