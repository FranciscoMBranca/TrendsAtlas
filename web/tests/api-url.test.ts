import { describe, expect, it } from "vitest";
import { normaliseApiUrl } from "@/lib/api";

describe("NEXT_PUBLIC_API_URL", () => {
  it("adds https:// when the value has no scheme", () => {
    expect(normaliseApiUrl("trendsatlas-production.up.railway.app", false)).toBe("https://trendsatlas-production.up.railway.app");
  });
  it("keeps an explicit scheme and drops trailing slashes and spaces", () => {
    expect(normaliseApiUrl(" https://api.example.com/ ", false)).toBe("https://api.example.com");
    expect(normaliseApiUrl("http://localhost:8000", false)).toBe("http://localhost:8000");
  });
  it("uses http for localhost without a scheme", () => {
    expect(normaliseApiUrl("localhost:8000", false)).toBe("http://localhost:8000");
  });
  it("never falls back to localhost in production", () => {
    expect(normaliseApiUrl(undefined, false)).toBe("");
    expect(normaliseApiUrl(undefined, true)).toBe("http://localhost:8000");
  });
});
