import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Inteliar Inbox",
  description: "Inbox de WhatsApp Business — Inteliar Stack",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="h-screen bg-[var(--ib-bg)] text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
