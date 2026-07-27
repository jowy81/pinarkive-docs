"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

const CONSENT_KEY = "pinarkive_cookie_consent";

function getStoredConsent(): "accepted" | "declined" | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === "accepted" || v === "declined") return v;
  return null;
}

function ensureGtag(measurementId: string) {
  if (typeof window === "undefined" || !measurementId) return false;
  if ((window as unknown as { __ga4Loaded?: boolean }).__ga4Loaded) return true;
  (window as unknown as { __ga4Loaded?: boolean }).__ga4Loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.onerror = () => console.error("[GA4] Failed to load gtag.js");
  document.head.appendChild(script);
  return true;
}

function sendPageView(measurementId: string, path?: string) {
  if (typeof window === "undefined" || !window.gtag || !measurementId) return;
  const pagePath = path ?? window.location.pathname + window.location.search;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: document.title,
    page_location: window.location.origin + pagePath,
    send_to: measurementId,
  });
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Cookie banner + GA4 for docs. Accept → load gtag and send page_view.
 * Reject → no script, no hits. Tracks SPA/route changes after accept.
 */
export default function CookieAnalytics() {
  const measurementId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "").trim();
  const router = useRouter();
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    setConsent(getStoredConsent());
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || !measurementId) return;
    ensureGtag(measurementId);
    sendPageView(measurementId, router.asPath);

    const onRoute = (url: string) => {
      sendPageView(measurementId, url);
    };
    router.events.on("routeChangeComplete", onRoute);
    return () => {
      router.events.off("routeChangeComplete", onRoute);
    };
  }, [consent, measurementId, router]);

  const onAccept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setConsent("accepted");
  }, []);

  const onDecline = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setConsent("declined");
  }, []);

  if (!measurementId) return null;

  if (consent !== null) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        borderTop: "1px solid #333",
        background: "rgba(17,17,17,0.96)",
        padding: "1rem",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.35)",
      }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: "#d4d4d8", flex: "1 1 240px" }}>
          We use analytics cookies to understand how the docs are used. Accept to
          enable Google Analytics, or reject to continue without tracking.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
          <button
            type="button"
            onClick={onDecline}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid #52525b",
              background: "transparent",
              color: "#e4e4e7",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              background: "#0284c7",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
