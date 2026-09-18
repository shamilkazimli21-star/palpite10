"use client";

import { useState } from "react";

function ensureMetaCookies() {
  const now = Date.now();

  if (!document.cookie.includes("_fbp=")) {
    const random =
      Math.floor(Math.random() * 1_000_000_000);

    document.cookie =
      `_fbp=fb.1.${now}.${random};` +
      "path=/;max-age=7776000;SameSite=Lax";
  }

  const url = new URL(window.location.href);
  const fbclid = url.searchParams.get("fbclid");

  if (
    fbclid &&
    !document.cookie.includes("_fbc=")
  ) {
    document.cookie =
      `_fbc=fb.1.${now}.${fbclid};` +
      "path=/;max-age=7776000;SameSite=Lax";
  }
}

export default function JoinFreeButton() {
  const [loading, setLoading] =
    useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      ensureMetaCookies();

      const response = await fetch(
        "/api/lead/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            landingUrl:
              window.location.href,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.telegramUrl) {
        throw new Error(
          "Could not create Telegram link."
        );
      }

      window.location.href =
        data.telegramUrl;
    } catch (error) {
      console.error(error);

      alert(
        "Não foi possível abrir o Telegram. Tente novamente."
      );

      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        border: 0,
        borderRadius: 12,
        padding: "16px 24px",
        fontSize: 17,
        fontWeight: 700,
        cursor: loading
          ? "wait"
          : "pointer",
      }}
    >
      {loading
        ? "Abrindo Telegram..."
        : "Quero entrar grátis"}
    </button>
  );
}
