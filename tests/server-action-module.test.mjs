import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the Telegram server-action module exports no runtime value besides async actions", () => {
  const source = readFileSync(new URL("../app/actions.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /^export\s+(?:const|let|var)\s+/m);
});
