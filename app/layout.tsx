import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "LexaDeck",
  description: "A typographic language flashcard studio",
  manifest: "/manifest.webmanifest",
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
