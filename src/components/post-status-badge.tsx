import { getPostStatusLabel, getPostStatusTone } from "@/lib/post-status";

export function PostStatusBadge({
  status,
}: Readonly<{
  status: string | null | undefined;
}>) {
  if (!status) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getPostStatusTone(status)}`}
    >
      {getPostStatusLabel(status)}
    </span>
  );
}
