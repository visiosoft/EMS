import { describe, expect, it } from "vitest";
import { isSafeAppPath, resolvePostLoginPath } from "./postLogin";

describe("isSafeAppPath", () => {
  it("accepts in-app paths", () => {
    expect(isSafeAppPath("/")).toBe(true);
    expect(isSafeAppPath("/internal")).toBe(true);
    expect(isSafeAppPath("/apps")).toBe(true);
  });

  it("rejects external and protocol-relative paths", () => {
    expect(isSafeAppPath("//evil.com")).toBe(false);
    expect(isSafeAppPath("https://evil.com")).toBe(false);
    expect(isSafeAppPath("")).toBe(false);
  });
});

describe("resolvePostLoginPath", () => {
  it("defaults to app chooser", () => {
    expect(resolvePostLoginPath()).toBe("/apps");
    expect(resolvePostLoginPath(undefined)).toBe("/apps");
    expect(resolvePostLoginPath("//evil")).toBe("/apps");
  });

  it("preserves internal deep links", () => {
    expect(resolvePostLoginPath("/internal")).toBe("/internal");
    expect(resolvePostLoginPath("/internal/news")).toBe("/internal/news");
  });

  it("preserves EMS root", () => {
    expect(resolvePostLoginPath("/")).toBe("/");
  });
});
