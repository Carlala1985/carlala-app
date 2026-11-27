"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Sends one anonymous page view per page (path only, no query string). No cookies, no storage. */
export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ s: "app", p: path, r: document.referrer, l: navigator.language });
    try {
      if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) {
        fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
      }
    } catch { /* statistics must never break the page */ }
  }, [path]);
  return null;
}
