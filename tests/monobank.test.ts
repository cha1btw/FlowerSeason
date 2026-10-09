import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { verifyWebhookSignature } from "../lib/payments/monobank.ts";

// monobank gives the key as base64(PEM); reproduce that format with our own pair.
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const publicKeyBase64 = Buffer.from(
  publicKey.export({ type: "spki", format: "pem" }),
).toString("base64");

const body = Buffer.from(
  JSON.stringify({ invoiceId: "p2_abc", status: "success", amount: 400000 }),
);
const signatureBase64 = sign("sha256", body, privateKey).toString("base64");

test("a correctly signed webhook body is accepted", () => {
  assert.equal(verifyWebhookSignature(body, signatureBase64, publicKeyBase64), true);
});

test("a body changed by one byte is rejected", () => {
  const tampered = Buffer.from(body.toString().replace("400000", "100"));
  assert.equal(verifyWebhookSignature(tampered, signatureBase64, publicKeyBase64), false);
});

test("a signature made with a different key is rejected", () => {
  const other = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const forged = sign("sha256", body, other.privateKey).toString("base64");
  assert.equal(verifyWebhookSignature(body, forged, publicKeyBase64), false);
});

test("garbage signature or key never throws", () => {
  assert.equal(verifyWebhookSignature(body, "not-base64!!", publicKeyBase64), false);
  assert.equal(verifyWebhookSignature(body, signatureBase64, "garbage"), false);
  assert.equal(verifyWebhookSignature(body, "", ""), false);
});
