import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurakshaSetu · Disaster Intelligence",
  description: "Connected intelligence for safer communities. Multi-hazard assessment, capacity-aware relocation and evidence-grounded decision support.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
