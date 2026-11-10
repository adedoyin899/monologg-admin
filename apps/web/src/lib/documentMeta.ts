import { useEffect } from "react";

// features.md Phase 15 (FA-3) — client-side Open Graph / meta tag injection
// for the public storefront's "rich link preview" requirement.
//
// Honest limitation: this app is a plain Vite SPA with no SSR framework, so
// these tags land in <head> only after React mounts. A real crawler
// (Slack/Twitter/iMessage unfurling, none of which execute JS) hits the raw
// HTML shell and won't see them — true crawler-facing previews need either
// an SSR migration or a bot-detection pre-render step at the hosting layer,
// both out of this phase's scope (flagged to the user, who chose this
// client-side approach for now). What this DOES give: a real, testable
// document.title + <head> meta state for anything that does run JS (an
// in-app "share" surface, a Playwright/browser-based check, or a future
// crawler-aware upgrade layered on top without changing the call site below).

export interface DocumentMetaInput {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  /** og:type — defaults to "profile", the correct OG type for a person/talent page. */
  type?: string;
}

function upsert(attr: "name" | "property", key: string, content: string, created: HTMLMetaElement[]): void {
  const existing = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }
  const el = document.createElement("meta");
  el.setAttribute(attr, key);
  el.setAttribute("content", content);
  document.head.appendChild(el);
  created.push(el);
}

/** Sets document.title plus the og: and twitter: meta tags; returns a cleanup
 * function that restores the previous title and removes any tags THIS call
 * created (tags that already existed are left with their prior content
 * untouched — best-effort restore, not a full snapshot/rollback). */
export function setDocumentMeta(input: DocumentMetaInput): () => void {
  const previousTitle = document.title;
  document.title = input.title;

  const created: HTMLMetaElement[] = [];
  const url = input.url ?? (typeof window !== "undefined" ? window.location.href : undefined);

  upsert("property", "og:title", input.title, created);
  upsert("property", "og:type", input.type ?? "profile", created);
  if (input.description) upsert("property", "og:description", input.description, created);
  if (input.image) upsert("property", "og:image", input.image, created);
  if (url) upsert("property", "og:url", url, created);

  upsert("name", "twitter:card", input.image ? "summary_large_image" : "summary", created);
  upsert("name", "twitter:title", input.title, created);
  if (input.description) upsert("name", "twitter:description", input.description, created);
  if (input.image) upsert("name", "twitter:image", input.image, created);
  if (input.description) upsert("name", "description", input.description, created);

  return () => {
    document.title = previousTitle;
    for (const el of created) el.remove();
  };
}

export function useDocumentMeta(input: DocumentMetaInput | null): void {
  useEffect(() => {
    if (!input) return;
    return setDocumentMeta(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.title, input?.description, input?.image, input?.url, input?.type]);
}
