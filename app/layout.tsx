import type { Viewport } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { Toaster } from "sonner";

const fontSans = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#febd1c",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  title: "1to7 Media | Creator Portal",
  description: "Find premium brand collaborations and manage your influencer campaigns.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "1to7 Media",
  },
  icons: {
    icon: [
      { url: '/logo-icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="1to7 Media" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="1to7 Media" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__deferredPwaPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__deferredPwaPrompt = e;
                window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
              });
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              }
            `,
          }}
        />
      </head>
      <body
        className={`${fontSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PwaProvider>
            <div className="min-h-screen flex flex-col bg-slate-50">
              <main className="flex-grow">
                {children}
              </main>
            </div>
            <Toaster theme="dark" position="top-center" richColors />
          </PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
