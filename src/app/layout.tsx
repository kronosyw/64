import type { Metadata } from "next";
import { AuthedChrome } from "@/components/AuthedChrome";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "잉잉관리자",
  description: "지점 · 일정 · 근태 · 급여 관리",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>
          <AuthedChrome>{children}</AuthedChrome>
        </Providers>
      </body>
    </html>
  );
}
