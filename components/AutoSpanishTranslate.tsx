"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const COOKIE_NAME = "googtrans";
const ES_VALUE = "/en/es";

function isSpanishBrowser() {
  if (typeof navigator === "undefined") return false;
  const lang = (navigator.language || "").toLowerCase();
  return lang.startsWith("es");
}

function setTranslateCookie(value: string) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}`;
}

function getTranslateCookie() {
  const key = `${COOKIE_NAME}=`;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(key));
  return match ? decodeURIComponent(match.slice(key.length)) : "";
}

export default function AutoSpanishTranslate() {
  useEffect(() => {
    if (!isSpanishBrowser()) return;

    if (getTranslateCookie() !== ES_VALUE) {
      setTranslateCookie(ES_VALUE);
      // Force one refresh so Google Translate applies immediately.
      window.location.reload();
      return;
    }

    const existing = document.getElementById("google-translate-script");
    if (existing) return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      // Hidden widget, translation is controlled by cookie.
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,es",
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <div id="google_translate_element" style={{ display: "none" }} />;
}

