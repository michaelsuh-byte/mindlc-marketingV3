import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindLC — AI Marketing Command Center & Mentorship Studio",
  description:
    "AI Marketing Command Center for MindLC (Ontario Math Grades 7-12: Human Learning Managers + Socratic AI)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
