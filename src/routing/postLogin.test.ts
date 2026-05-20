import type { AccountInfo } from "@azure/msal-browser";
import { describe, expect, it } from "vitest";
import { isSafeAppPath, resolvePostLoginPath } from "./postLogin";

const allowedEmail = ["safyan.ashraf", String.fromCharCode(64), "nkutechnologies.com"].join("");

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
  it("sends users without Company Hub access directly to EMS", () => {
    expect(resolvePostLoginPath()).toBe("/");
    expect(resolvePostLoginPath(undefined, mockAccount("user@example.com"))).toBe("/");
    expect(resolvePostLoginPath("//evil", mockAccount("user@example.com"))).toBe("/");
  });

  it("defaults allowed Company Hub users to the app chooser", () => {
    const account = mockAccount(allowedEmail);
    expect(resolvePostLoginPath(undefined, account)).toBe("/apps");
    expect(resolvePostLoginPath("//evil", account)).toBe("/apps");
  });

  it("sends allowed Company Hub users to the hub root (no child paths in the URL)", () => {
    const account = mockAccount(allowedEmail);
    expect(resolvePostLoginPath("/internal", account)).toBe("/internal");
    expect(resolvePostLoginPath("/internal/news", account)).toBe("/internal");
    expect(resolvePostLoginPath("/internal/employee-services#handbook", account)).toBe("/internal");
  });

  it("blocks internal routes for users without Company Hub access", () => {
    const account = mockAccount("user@example.com");
    expect(resolvePostLoginPath("/internal", account)).toBe("/");
    expect(resolvePostLoginPath("/internal/news", account)).toBe("/");
  });

  it("preserves EMS root", () => {
    expect(resolvePostLoginPath("/")).toBe("/");
  });
});
