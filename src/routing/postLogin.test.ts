import type { AccountInfo } from "@azure/msal-browser";
import { describe, expect, it } from "vitest";
import { isSafeAppPath, resolvePostLoginPath } from "./postLogin";

const hubAccountEmail = ["safyan.ashraf", "nkutechnologies.com"].join("@");

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
  it("defaults the permitted hub account to the app chooser", () => {
    const account = mockAccount(hubAccountEmail);
    expect(resolvePostLoginPath(undefined, account)).toBe("/apps");
    expect(resolvePostLoginPath("//example.test", account)).toBe("/apps");
  });

  it("defaults a regular account to EMS", () => {
    const account = mockAccount("person@example.test");
    expect(resolvePostLoginPath(undefined, account)).toBe("/");
    expect(resolvePostLoginPath("//example.test", account)).toBe("/");
    expect(resolvePostLoginPath()).toBe("/");
  });

  it("keeps internal deep links available for the permitted hub account", () => {
    const account = mockAccount(hubAccountEmail);
    expect(resolvePostLoginPath("/internal", account)).toBe("/internal");
    expect(resolvePostLoginPath("/internal/news", account)).toBe("/internal");
    expect(resolvePostLoginPath("/internal/employee-services#handbook", account)).toBe("/internal");
  });

  it("returns EMS for internal deep links from a regular account", () => {
    const account = mockAccount("person@example.test");
    expect(resolvePostLoginPath("/internal", account)).toBe("/");
    expect(resolvePostLoginPath("/internal/news", account)).toBe("/");
    expect(resolvePostLoginPath("/internal/employee-services#handbook", account)).toBe("/");
  });

  it("preserves EMS root", () => {
    expect(resolvePostLoginPath("/")).toBe("/");
  });
});
