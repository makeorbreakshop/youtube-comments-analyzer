import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import DashboardNav from "@/components/dashboard-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Commenter",
  description: "Import and analyze comments from YouTube channels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <DashboardNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
} 