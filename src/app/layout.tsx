import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Atomic Pathshala - AI Doubt Solver",
  description:
    "Solve academic doubts instantly in English, Hindi, or Hinglish. Upload images, PDFs, screenshots, and camera photos for step-by-step AI explanations.",
  keywords: [
    "Atomic Pathshala",
    "doubt solver",
    "AI tutor",
    "NEET",
    "JEE",
    "Hindi",
    "Hinglish",
    "education",
  ],
  authors: [{ name: "Atomic Pathshala" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
