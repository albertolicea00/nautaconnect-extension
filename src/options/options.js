"use strict";

const api = typeof browser !== "undefined" ? browser : chrome;

const form = document.getElementById("form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const languageSelect = document.getElementById("language");
const savedMsg = document.getElementById("savedMsg");

async function load() {
  await NautaI18n.load();
  NautaI18n.apply();

  const { credentials, settings } = await api.storage.local.get(["credentials", "settings"]);
  if (credentials) {
    usernameInput.value = credentials.username || "";
    passwordInput.value = credentials.password || "";
  }
  languageSelect.value = (settings && settings.lang) || "auto";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await api.storage.local.set({
    credentials: {
      username: usernameInput.value.trim(),
      password: passwordInput.value,
    },
    settings: { lang: languageSelect.value },
  });

  // Re-render in the (possibly) new language.
  await NautaI18n.load();
  NautaI18n.apply();

  savedMsg.hidden = false;
  setTimeout(() => {
    savedMsg.hidden = true;
  }, 1500);
});

load();
