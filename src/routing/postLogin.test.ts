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

  it("rejects external and protocol-relative paths", () => {
    expect(isSafeAppPath("//evil.com")).toBe(false);
    expect(isSafeAppPath("https://evil.com")).toBe(false);
    expect(isSafeAppPath("")).toBe(false);
  });
});

describe("resolvePostLoginPath", () => {
  it("defaults signed-in users to the app chooser", () => {
    expect(resolvePostLoginPath()).toBe("/apps");
    expect(resolvePostLoginPath(undefined, mockAccount("user@example.com"))).toBe("/apps");
    expect(resolvePostLoginPath("//evil", mockAccount("user@example.com"))).toBe("/apps");
  });

  it("sends users to the hub root for internal deep links", () => {
    const account = mockAccount("user@example.com");
    expect(resolvePostLoginPath("/internal", account)).toBe("/internal");
    expect(resolvePostLoginPath("/internal/news", account)).toBe("/internal");
    expect(resolvePostLoginPath("/internal/employee-services#handbook", account)).toBe("/internal");
  });

  it("preserves EMS root", () => {
    expect(resolvePostLoginPath("/")).toBe("/");
  });
});
