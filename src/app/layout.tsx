import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Foundry — build a website by describing it",
  description:
    "Describe the site you want in plain English. Foundry casts it into a complete, responsive, single-file website you can preview, refine, and download.",
  applicationName: "Foundry",
  openGraph: {
    title: "Foundry — build a website by describing it",
    description:
      "Describe the site you want in plain English. Foundry casts it into a complete, responsive website in seconds.",
    siteName: "Foundry",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never `maximum-scale` / `user-scalable: no` — pinch zoom stays available.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
};

/**
 * Runs before first paint so the correct theme is applied without a flash.
 * Kept tiny and dependency-free on purpose.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('foundry-theme');
    var mode = stored === 'light' || stored === 'dark' ? stored
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-accent-fg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
