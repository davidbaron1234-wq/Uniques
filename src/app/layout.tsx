import type { Metadata, Viewport } from "next";
import { InventoryProvider } from "@/lib/InventoryContext";
import { PreferencesProvider } from "@/lib/UserPreferencesContext";
import { NotificationProvider } from "@/lib/NotificationContext";
import { AchievementsProvider } from "@/lib/AchievementsContext";
import AuthProvider from "@/components/AuthProvider";
import ToastOverlay from "@/components/ToastOverlay";
import TourCleanup from "@/components/TourCleanup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uniques - Trade & Collect",
  description: "The ultimate platform for collectors to exchange and sell unique collectibles",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#221F1F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-body">
        <AuthProvider>
          <InventoryProvider>
            <PreferencesProvider>
            <NotificationProvider>
              <AchievementsProvider>
                <TourCleanup />
                {children}
                <ToastOverlay />
              </AchievementsProvider>
            </NotificationProvider>
            </PreferencesProvider>
          </InventoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
