import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inteliar Inbox",
  description: "Inbox de WhatsApp Business — Inteliar Stack",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="h-screen bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
