import { describe, expect, it } from "vitest";
import { cn, formatRelativeTime } from "./utils";

describe("cn()", () => {
  it("joins plain class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind classes to the last one (tailwind-merge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatRelativeTime()", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");

  it("renders minutes, hours, and days ago at the right thresholds", () => {
    expect(formatRelativeTime(new Date(now.getTime() - 30_000).toISOString(), now)).toBe("just now");
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe("5m ago");
    expect(formatRelativeTime(new Date(now.getTime() - 2 * 3_600_000).toISOString(), now)).toBe("2h ago");
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 86_400_000).toISOString(), now)).toBe("3d ago");
  });

  it("falls back to a locale date once older than a week", () => {
    const eightDaysAgo = new Date(now.getTime() - 8 * 86_400_000).toISOString();
    expect(formatRelativeTime(eightDaysAgo, now)).toBe(new Date(eightDaysAgo).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  });
});
