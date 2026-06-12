import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  // absolute URLs for og:image etc. — link-preview scrapers require them
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://lexadeck.vercel.app",
  ),
  title: "LexaDeck",
  description:
    "Flashcards for anything — FSRS spaced repetition, AI-enriched cards, typographic design.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "LexaDeck",
    description:
      "Flashcards for anything — FSRS spaced repetition, AI-enriched cards, typographic design.",
    url: "/",
    siteName: "LexaDeck",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LexaDeck",
    description:
      "Flashcards for anything — FSRS spaced repetition, AI-enriched cards, typographic design.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF6",
};

// Applies the persisted theme before first paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem("lexadeck-theme");if(t==="dark"||(t===null&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.dataset.theme="dark"}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* text/plain on the client: the script only matters during HTML
            parsing; this silences React's dev warning when the tree
            client-renders (per next docs: preventing-flash-before-hydration) */}
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
