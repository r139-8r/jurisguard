import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JurisGuard - Legal Risk Assessment",
  description: "AI-powered legal risk assessment for SMEs. Upload a contract, get a safety score and fix-list in 30 seconds.",
  keywords: ["legal", "contract", "NDA", "risk assessment", "AI", "SME"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
