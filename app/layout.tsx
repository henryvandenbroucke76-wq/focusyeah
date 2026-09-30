import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Miseora — A little inspiration for your kitchen",
  description: "Find your next favourite meal. Cook with what you have, save recipes, and share something delicious.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
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
