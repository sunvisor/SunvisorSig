import { getStoredAttachment } from "@/lib/attachment-storage";

type RouteContext = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { key } = await params;
  const storagePath = `/attachments/${key.join("/")}`;
  const attachment = await getStoredAttachment(storagePath);

  if (!attachment) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("Content-Length", String(attachment.size));
  headers.set(
    "Content-Type",
    attachment.httpMetadata?.contentType ?? "application/octet-stream",
  );

  if (attachment.httpEtag) {
    headers.set("ETag", attachment.httpEtag);
  }

  return new Response(attachment.body, { headers });
}
