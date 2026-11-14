import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Tempo",
  description: "Earth system trends from NASA data: what is changing, by how much, and is it more than noise?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
