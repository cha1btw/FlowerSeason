import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const content = readFileSync(new URL("../lib/content.ts", import.meta.url), "utf8");

test("the entry page offers exactly the business and individuals doors", () => {
  const gateway = content.slice(content.indexOf("gateway: {"), content.indexOf("navigation: {"));
  assert.match(gateway, /href: "\/business"/);
  assert.match(gateway, /href: "\/workshops"/);
  assert.equal((gateway.match(/href:/g) ?? []).length, 2);
});

test("every door points to a page that exists", () => {
  assert.ok(existsSync(new URL("../app/business/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../app/workshops/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../app/page.tsx", import.meta.url)));
});

test("each landing links to the other audience", () => {
  const businessNav = content.slice(content.indexOf("navigation: {"), content.indexOf("hero: {"));
  assert.match(businessNav, /href: "\/workshops"/);
  const workshopsNav = content.slice(content.indexOf("workshopsPage: {"));
  assert.match(workshopsNav, /href: "\/business"/);
});
