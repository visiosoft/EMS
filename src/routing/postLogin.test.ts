import type { AccountInfo } from "@azure/msal-browser";
import { describe, expect, it } from "vitest";
import { isSafeAppPath, resolvePostLoginPath } from "./postLogin";

function mockAccount(username: string): AccountInfo {
  return {
    homeAccountId: "test-home-account-id",
    environment: "login.microsoftonline.com",
    tenantId: "test-tenant-id",
    username,
    localAccountId: "test-local-account-id",
    name: "Test User",
  } as AccountInfo;
}

describe("isSafeAppPath", () => {
  it("accepts in-app paths", () => {
    expect(isSafeAppPath("/")).toBe(true);
    expect(isSafeAppPath("/internal")).toBe(true);
    expect(isSafeAppPath("/apps")).toBe(true);
  });

  it("rejects unsafe paths", () => {
    expect(isSafeAppPath("//example.test")).toBe(false);
    expect(isSafeAppPath("https://example.test")).toBe(false);
    expect(isSafeAppPath("")).toBe(false);
  });
});

describe("resolvePostLoginPath", () => {
  it("defaults any authenticated user to the app chooser", () => {
    const account = mockAccount("person@example.test");
    expect(resolvePostLoginPath(undefined, account)).toBe("/apps");
    expect(resolvePostLoginPath("//example.test", account)).toBe("/apps");
  });

  it("returns authenticated users to the chooser even when they started from a deep link", () => {
    const account = mockAccount("person@example.test");
    expect(resolvePostLoginPath("/internal", account)).toBe("/apps");
    expect(resolvePostLoginPath("/internal/news", account)).toBe("/apps");
    expect(resolvePostLoginPath("/internal/employee-services#handbook", account)).toBe("/apps");
    expect(resolvePostLoginPath("/", account)).toBe("/apps");
  });

  it("preserves EMS root", () => {
    expect(resolvePostLoginPath("/")).toBe("/");
  });

  it("falls back to EMS_ROOT when no account is provided", () => {
    expect(resolvePostLoginPath()).toBe("/");
  });
});
