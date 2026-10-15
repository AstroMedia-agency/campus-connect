import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusConnect — Team Formation & Task Graphs",
  description: "Skill-matrix team formation and DAG-based task tracking for academic projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body bg-paper text-ink min-h-screen">{children}</body>
    </html>
  );
}
