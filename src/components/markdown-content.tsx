import { AttachmentLink } from "@/components/attachment-link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AttachmentRef = {
  id: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes?: number;
};

type MarkdownContentProps = Readonly<{
  value: string;
  attachments?: AttachmentRef[];
  attachmentDeleteConfig?: {
    action: (formData: FormData) => Promise<void>;
    ariaLabel: string;
    message: string;
    description?: string;
    buildFields: (attachment: AttachmentRef) => Record<string, string>;
  };
}>;

function MissingAttachmentChip({ filename }: Readonly<{ filename: string }>) {
  return (
    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
      Missing: {filename}
    </span>
  );
}

export function MarkdownContent({
  value,
  attachments = [],
  attachmentDeleteConfig,
}: MarkdownContentProps) {
  const attachmentMap = new Map(
    attachments.map((attachment) => [attachment.originalFilename, attachment]),
  );

  return (
    <div className="[&_a]:font-medium [&_a]:text-sky-700 [&_a]:underline [&_a]:decoration-sky-300 [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-slate-900 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-xl [&_h3]:font-semibold [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-slate-200 [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-50 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (href?.startsWith("attachment:")) {
              const filename = href.replace("attachment:", "");
              const attachment = attachmentMap.get(filename);

              if (!attachment) {
                return <MissingAttachmentChip filename={filename} />;
              }

              return (
                <AttachmentLink
                  compact
                  deleteAction={attachmentDeleteConfig?.action}
                  deleteAriaLabel={attachmentDeleteConfig?.ariaLabel}
                  deleteDescription={attachmentDeleteConfig?.description}
                  deleteFields={
                    attachmentDeleteConfig
                      ? attachmentDeleteConfig.buildFields(attachment)
                      : undefined
                  }
                  deleteMessage={attachmentDeleteConfig?.message}
                  filename={attachment.originalFilename}
                  mimeType={attachment.mimeType}
                  sizeBytes={attachment.sizeBytes}
                  storagePath={attachment.storagePath}
                />
              );
            }

            return (
              <a
                className="font-medium underline decoration-sky-300 underline-offset-4"
                href={href}
                rel="noreferrer"
                target="_blank"
              >
                {children}
              </a>
            );
          },
          img() {
            return (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                画像埋め込みは添付参照のみ許可
              </span>
            );
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
