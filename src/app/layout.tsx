import type { Metadata, Viewport } from "next";
import { InventoryProvider } from "@/lib/InventoryContext";
import { NotificationProvider } from "@/lib/NotificationContext";
import AuthProvider from "@/components/AuthProvider";
import ToastOverlay from "@/components/ToastOverlay";
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
            <NotificationProvider>
              {children}
              <ToastOverlay />
            </NotificationProvider>
          </InventoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
