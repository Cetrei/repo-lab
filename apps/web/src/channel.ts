import { createContext, useContext } from "react";

/**
 * The site is published twice: the stable build at the root and the test channel under `/next/`. The test channel
 * is the same code built with `vite build --mode next`, and it turns on the views that are still being tried.
 */
export type Channel = "stable" | "next";

export const CHANNEL: Channel = import.meta.env.MODE === "next" ? "next" : "stable";

/** A context, so a test can render the test channel without building it. */
export const ChannelContext = createContext<Channel>(CHANNEL);

export function useChannel(): Channel {
  return useContext(ChannelContext);
}
