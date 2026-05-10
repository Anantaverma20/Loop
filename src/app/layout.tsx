import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loop — Your Personal Accountability Agent",
  description:
    "Connect your money, health, and habits to your actual goals.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◎</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5] antialiased">
        {children}
      </body>
    </html>
  );
}
