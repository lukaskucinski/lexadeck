// The view params now live in client state (instant, no server round-trip) — see
// CardViewProvider. Controls keep importing useViewParams from here unchanged.
export { useViewParams, type SetParams } from "./CardViewProvider";
