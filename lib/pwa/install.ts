/**
 * PWA install affordance logic — pure so it's unit-tested; the InstallButton
 * client component is a thin wrapper that reads `navigator`/events and dispatches.
 *
 * Android/desktop Chrome fire `beforeinstallprompt`; iOS never does (install is
 * manual via Share ▸ Add to Home Screen), so we detect iOS Safari to show
 * instructions instead.
 */

export interface IosEnv {
  ua: string;
  /** navigator.maxTouchPoints — needed because iPadOS 13+ reports a desktop-Mac UA. */
  maxTouchPoints?: number;
}

export function isIos(env: IosEnv): boolean {
  if (/iphone|ipad|ipod/i.test(env.ua)) return true;
  // iPadOS 13+ Safari masquerades as macOS; touch points give it away
  if (/macintosh|mac os x/i.test(env.ua) && (env.maxTouchPoints ?? 0) > 1) return true;
  return false;
}

/** iOS Safari specifically (excludes Chrome/Firefox/Edge on iOS, which can't install). */
export function isIosSafari(env: IosEnv): boolean {
  return isIos(env) && !/crios|fxios|edgios|opios/i.test(env.ua);
}

export function isIosSafariNonStandalone(env: IosEnv & { standalone: boolean }): boolean {
  return isIosSafari(env) && !env.standalone;
}

export type InstallStatus = "idle" | "installable" | "installed";
export type InstallEvent = { type: "installable" | "installed" | "consumed" };

/**
 * idle → installable (beforeinstallprompt) → installed (appinstalled/standalone).
 * `installed` is terminal; `consumed` (the native prompt was shown and used up)
 * drops back to idle to await a possible future `beforeinstallprompt`.
 */
export function installReducer(state: InstallStatus, event: InstallEvent): InstallStatus {
  if (event.type === "installed") return "installed";
  if (state === "installed") return "installed";
  if (event.type === "installable") return "installable";
  if (event.type === "consumed") return "idle";
  return state;
}
