import { describe, expect, it } from "vitest";
import { installReducer, isIos, isIosSafari, isIosSafariNonStandalone } from "./install";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
// iPadOS 13+ Safari reports a desktop-Mac UA; only touch points reveal the iPad
const IPAD_OS =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 5) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36";
const CHROME_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148";
const DESKTOP_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";

describe("isIos", () => {
  it("detects iPhone and iPadOS-as-Mac (touch), not Android or a real desktop Mac", () => {
    expect(isIos({ ua: IPHONE })).toBe(true);
    expect(isIos({ ua: IPAD_OS, maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ ua: ANDROID })).toBe(false);
    expect(isIos({ ua: DESKTOP_MAC, maxTouchPoints: 0 })).toBe(false);
  });
});

describe("isIosSafari", () => {
  it("excludes Chrome-on-iOS (CriOS) which cannot Add to Home Screen", () => {
    expect(isIosSafari({ ua: IPHONE })).toBe(true);
    expect(isIosSafari({ ua: CHROME_IOS })).toBe(false);
  });
});

describe("isIosSafariNonStandalone", () => {
  it("true only on iOS Safari that is not already installed", () => {
    expect(isIosSafariNonStandalone({ ua: IPHONE, standalone: false })).toBe(true);
    expect(isIosSafariNonStandalone({ ua: IPHONE, standalone: true })).toBe(false);
    expect(isIosSafariNonStandalone({ ua: ANDROID, standalone: false })).toBe(false);
  });
});

describe("installReducer", () => {
  it("idle → installable → installed; installed is terminal", () => {
    expect(installReducer("idle", { type: "installable" })).toBe("installable");
    expect(installReducer("installable", { type: "installed" })).toBe("installed");
    expect(installReducer("installed", { type: "installable" })).toBe("installed");
  });
  it("consumed (native prompt used up) returns to idle to await the next event", () => {
    expect(installReducer("installable", { type: "consumed" })).toBe("idle");
  });
});
