import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the Telegram server-action module exports no runtime value besides async actions", () => {
  const source = readFileSync(new URL("../app/actions.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /^export\s+(?:const|let|var)\s+/m);
});

test("a successful form submission opens an accessible confirmation dialog", () => {
  const source = readFileSync(
    new URL("../components/contact-form.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /closeSuccessDialog/);
});

test("editorial galleries do not render repeated static image slots", () => {
  const pageSource = readFileSync(new URL("../app/business/page.tsx", import.meta.url), "utf8");
  const contentSource = readFileSync(new URL("../lib/content.ts", import.meta.url), "utf8");

  assert.doesNotMatch(pageSource, /gifts\.images\[2\]/);
  assert.doesNotMatch(pageSource, /flowerBar\.media\.detail/);
  assert.match(contentSource, /videoPoster: "\/media\/workshops-kit\.webp"/);
});
