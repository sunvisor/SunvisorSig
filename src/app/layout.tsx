import type { Metadata } from "next";
import { AuthStatus } from "@/components/auth-status";
import "./globals.css";

export const metadata: Metadata = {
  title: "SunvisorSig",
  description: "Customer forum development sandbox",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-end px-6 py-4">
          <div className="pointer-events-auto">
            <AuthStatus />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
