import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Foundations of Law — Interactive Mind Map",
  description: "Explore 14 topics and 33 exam Q&As from the Foundations of Law open-book exam companion in an interactive, visual mind map.",
  keywords: ["Foundations of Law", "mind map", "exam companion", "legal education", "NSW", "Australia"],
  authors: [{ name: "Law Extension Committee" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

// Viewport must be its own export (Next.js ignores it inside `metadata`).
// maximumScale/userScalable are intentionally NOT locked so touch devices
// can zoom; the mind map implements its own pinch/pan gestures.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
