"use strict";

// Pure parsing helpers for ETECSA captive portal HTML responses.
// Loaded by the background script (worker importScripts on Chrome,
// manifest background.scripts on Firefox) and by the Node tests via CJS.
const NautaParse = {
  // Value of a hidden form input, matched by its name attribute.
  hiddenInputValue(html, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`name=["']${escaped}["'][^>]*?value=["']([^"']*)["']`, "s");
    const match = re.exec(html);
    return match ? match[1] : null;
  },

  // Session handle required by LogoutServlet, present after a successful login.
  attributeUUID(html) {
    const match = /ATTRIBUTE_UUID=([A-Fa-f0-9]+)/.exec(html);
    return match ? match[1] : null;
  },

  // Error message the portal reports through a JavaScript alert().
  alertMessage(html) {
    const match = /alert\s*\(\s*["']([^"']+)["']/.exec(html);
    return match ? match[1] : null;
  },

  // Remaining time (HH:MM:SS, hours may exceed two digits).
  timeString(text) {
    const match = /(\d{1,3}:\d{2}:\d{2})/.exec(text);
    return match ? match[1] : null;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = NautaParse;
}
if (typeof globalThis !== "undefined") {
  globalThis.NautaParse = NautaParse;
}
