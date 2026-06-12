import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Social-share card (WhatsApp, iMessage, Slack, …). Without this, scrapers
// fall back to upscaling the 48px favicon — a blurry mess. Statically
// generated at build time. Brand tokens mirror app/globals.css (light mode).
export const alt = "lexadeck — flashcards for anything";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [extraBold, medium] = await Promise.all([
    readFile(join(process.cwd(), "assets/Archivo-ExtraBold.ttf")),
    readFile(join(process.cwd(), "assets/Archivo-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fafaf6",
          color: "#16150f",
          fontFamily: "Archivo",
          padding: "72px 80px 64px",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#74726a",
          }}
        >
          spaced repetition, typographically
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 176,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 0.95,
            }}
          >
            lexadeck<span style={{ color: "#f4502e" }}>.</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 52,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "#16150f",
            }}
          >
            flashcards for&nbsp;
            <span style={{ color: "#f4502e", fontWeight: 800 }}>anything.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "3px solid #16150f",
            paddingTop: 24,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#74726a",
          }}
        >
          <span>fsrs scheduling</span>
          <span>ai-enriched cards</span>
          <span>csv import</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: extraBold, style: "normal", weight: 800 },
        { name: "Archivo", data: medium, style: "normal", weight: 500 },
      ],
    },
  );
}
