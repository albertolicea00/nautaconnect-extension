"use strict";

// Runtime locale loader. chrome.i18n cannot switch language on the fly, so we
// read the packaged messages.json for the language chosen in the options page
// ("auto" follows the browser UI language) and apply it to [data-i18n] nodes.
const NautaI18n = {
  dict: {},
  lang: "en",

  async load() {
    const api = typeof browser !== "undefined" ? browser : chrome;
    const { settings } = await api.storage.local.get("settings");
    let lang = settings && settings.lang;
    if (!lang || lang === "auto") {
      lang = (api.i18n.getUILanguage() || "en").startsWith("es") ? "es" : "en";
    }
    const url = api.runtime.getURL(`_locales/${lang}/messages.json`);
    this.dict = await (await fetch(url)).json();
    this.lang = lang;
    return this;
  },

  t(key) {
    return (this.dict[key] && this.dict[key].message) || key;
  },

  apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = this.t(el.dataset.i18n);
    });
  },
};
