import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetStoredAttachment = vi.fn();

vi.mock("@/lib/attachment-storage", () => ({
  getStoredAttachment: mockGetStoredAttachment,
}));

describe("/attachments/[...key]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetStoredAttachment.mockReset();
  });

  it("returns a stored attachment from R2", async () => {
    mockGetStoredAttachment.mockResolvedValue({
      body: new Response("payload").body,
      httpEtag: "\"etag\"",
      httpMetadata: {
        contentType: "text/plain",
      },
      size: 7,
    });

    const { GET } = await import("@/app/attachments/[...key]/route");
    const response = await GET(new Request("http://localhost/attachments/posts/post-1/readme.txt"), {
      params: Promise.resolve({ key: ["posts", "post-1", "readme.txt"] }),
    });

    expect(mockGetStoredAttachment).toHaveBeenCalledWith(
      "/attachments/posts/post-1/readme.txt",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(response.headers.get("Content-Length")).toBe("7");
    expect(response.headers.get("ETag")).toBe("\"etag\"");
    expect(await response.text()).toBe("payload");
  });

  it("returns 404 when the attachment is missing", async () => {
    mockGetStoredAttachment.mockResolvedValue(null);

    const { GET } = await import("@/app/attachments/[...key]/route");
    const response = await GET(new Request("http://localhost/attachments/posts/missing.txt"), {
      params: Promise.resolve({ key: ["posts", "missing.txt"] }),
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
