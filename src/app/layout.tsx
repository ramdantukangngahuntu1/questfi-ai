import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuestFi AI v3.0 — GameFi Dungeon Crawler",
  description: "AI-powered GameFi dungeon crawler. Combat, crafting, loot drops, party system, and boss fights with Llama 3.3 70B.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
