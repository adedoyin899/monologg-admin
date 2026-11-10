import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "Monologg Admin",
  description: "Internal operations and monitoring platform for Monologg",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-100 antialiased selection:bg-monologg-red selection:text-white">
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}

