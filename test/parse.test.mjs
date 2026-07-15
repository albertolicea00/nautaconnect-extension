import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const NautaParse = require("../src/parse.js");

const fixture = (name) => readFileSync(join(here, "fixtures", name), "utf8");

test("parses login page tokens", () => {
  const html = fixture("login_page.html");
  assert.equal(NautaParse.hiddenInputValue(html, "CSRFHW"), "39dd52d464cb68d8e512d64a56f274d9");
  assert.equal(NautaParse.hiddenInputValue(html, "wlanuserip"), "10.181.141.250");
  assert.equal(NautaParse.hiddenInputValue(html, "loggerId"), "20260715163945368");
});

test("missing input returns null", () => {
  assert.equal(NautaParse.hiddenInputValue(fixture("login_page.html"), "doesNotExist"), null);
});

test("parses ATTRIBUTE_UUID from online page", () => {
  assert.equal(
    NautaParse.attributeUUID(fixture("online_page.html")),
    "B2F6AAB9A9868BABC0BDA09B7F0E26FF"
  );
});

test("login page has no ATTRIBUTE_UUID", () => {
  assert.equal(NautaParse.attributeUUID(fixture("login_page.html")), null);
});

test("parses alert message from failed login", () => {
  assert.equal(
    NautaParse.alertMessage(fixture("login_failed.html")),
    "Entre el nombre de usuario y contraseña correctos."
  );
});

test("parses time strings", () => {
  assert.equal(NautaParse.timeString("04:29:37"), "04:29:37");
  assert.equal(NautaParse.timeString("<div>123:00:05</div>"), "123:00:05");
  assert.equal(NautaParse.timeString("errorop"), null);
});
