import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
