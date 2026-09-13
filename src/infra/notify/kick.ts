import "server-only";
import { after } from "next/server";
import { db } from "../db/client";
import { dispatchQueued } from "./dispatch";
import { activeNotifier } from "./providers";

/** Send whatever was queued by this request, after the response has gone out. */
export function kickDispatch() {
  after(async () => {
    try {
      await dispatchQueued(db, activeNotifier());
    } catch (e) {
      console.error("Notification dispatch failed", e);
    }
  });
}
