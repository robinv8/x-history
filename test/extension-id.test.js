"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

/** Chrome Web Store ID for https://chromewebstore.google.com/detail/jijknbffmnjebeklhmmfldhgkefgcdoo */
const CWS_ID = "jijknbffmnjebeklhmmfldhgkefgcdoo";

function extensionIdFromPublicKey(keyField) {
  const der = Buffer.from(
    String(keyField)
      .replace(/-----[^-]+-----/g, "")
      .replace(/\s+/g, ""),
    "base64",
  );
  assert.ok(der.length > 0, "manifest key must be a base64 SPKI public key");
  const hex = crypto.createHash("sha256").update(der).digest("hex").slice(0, 32);
  return [...hex]
    .map((c) => String.fromCharCode("a".charCodeAt(0) + parseInt(c, 16)))
    .join("");
}

describe("CWS public key", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"),
  );

  it("pins the published store ID so unpacked installs share chrome.storage.local", () => {
    assert.equal(typeof manifest.key, "string");
    assert.equal(extensionIdFromPublicKey(manifest.key), CWS_ID);
  });
});
