import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Atomic Guru by Atomic Pathshala",
  description:
    "Solve academic doubts instantly in English, Hindi, or Hinglish. Upload images, PDFs, screenshots, and camera photos for step-by-step AI explanations.",
  keywords: [
    "Atomic Guru",
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Atomic Guru",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
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
        <ServiceWorkerRegister />
        <ThemeProvider>
          <AuthSessionProvider>
  <AuthProvider>{children}</AuthProvider>
</AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

