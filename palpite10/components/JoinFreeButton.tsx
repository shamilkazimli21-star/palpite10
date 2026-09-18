"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { readCookie, visitorId } from "./MetaPixel";

export default function JoinFreeButton({ label = "Abrir no Telegram", variant = "primary" }: { label?: string; variant?: "primary" | "ghost" }) {
  const [busy, setBusy] = useState(false);
  // Works without JavaScript too: the server route creates the lead and redirects.
  const [href, setHref] = useState("/api/lead/start");

  useEffect(() => {
    setHref(`/api/lead/start${window.location.search}`);
  }, []);

  async function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const q = new URLSearchParams(window.location.search);
    try {
      const response = await fetch("/api/lead/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          visitorId: visitorId(),
          source: q.get("utm_source"),
          medium: q.get("utm_medium"),
          campaign: q.get("utm_campaign"),
          adset: q.get("utm_term") ?? q.get("adset"),
          ad: q.get("utm_content") ?? q.get("ad"),
          fbclid: q.get("fbclid"),
          fbc: readCookie("_fbc"),
          fbp: readCookie("_fbp"),
          landingUrl: window.location.href.slice(0, 1000),
        }),
      });
      const data = (await response.json()) as { telegramUrl?: string; eventId?: string | null };
      if (!data.telegramUrl) throw new Error("no url");
      // Same event id as the server-side event → Meta counts ONE click, not two. ("Lead" is sent by the server when the person actually starts the bot.)
      if (data.eventId && window.fbq) window.fbq("track", "Contact", { content_name: "telegram_cta" }, { eventID: data.eventId });
      window.setTimeout(() => {
        window.location.href = data.telegramUrl!;
        window.setTimeout(() => setBusy(false), 2500);
      }, 250);
    } catch {
      window.location.href = href;
    }
  }

  return (
    <a className={`cta cta--${variant}`} href={href} onClick={onClick} rel="nofollow" aria-busy={busy}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
        <path fill="currentColor" d="M21.9 4.3 18.7 19.6c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.300l-4.800-1.500c-1-.3-1.100-1 .2-1.500L20.500 3c.900-.300 1.600.200 1.400 1.300Z" />
      </svg>
      <span>{busy ? "Abrindo o Telegram…" : label}</span>
    </a>
  );
}
