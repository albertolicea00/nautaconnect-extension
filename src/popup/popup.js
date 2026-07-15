"use strict";

const api = typeof browser !== "undefined" ? browser : chrome;

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const elapsedEl = document.getElementById("elapsed");
const timeLeftRow = document.getElementById("timeLeftRow");
const timeLeftValue = document.getElementById("timeLeftValue");
const refreshBtn = document.getElementById("refreshBtn");
const errorEl = document.getElementById("error");
const mainBtn = document.getElementById("mainBtn");
const optionsBtn = document.getElementById("optionsBtn");

let session = null;
let ticker = null;

// Errors the background reports as keys; portal alert()s pass through verbatim.
const ERROR_KEYS = new Set(["missingCredentials", "portalUnreachable", "logoutFailed", "badResponse"]);

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function render() {
  const connected = session !== null;
  statusDot.classList.toggle("connected", connected);
  statusText.textContent = NautaI18n.t(connected ? "statusConnected" : "statusDisconnected");
  elapsedEl.hidden = !connected;
  timeLeftRow.hidden = !connected;
  mainBtn.textContent = NautaI18n.t(connected ? "disconnect" : "connect");
  mainBtn.classList.toggle("disconnect", connected);

  if (connected && !ticker) {
    ticker = setInterval(tick, 1000);
    tick();
  } else if (!connected && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function tick() {
  if (session) {
    elapsedEl.textContent = formatElapsed(Date.now() - session.loginDate);
  }
}

function showError(message) {
  errorEl.textContent = ERROR_KEYS.has(message) ? NautaI18n.t(message) : message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

async function refreshState() {
  const state = await api.runtime.sendMessage({ type: "getState" });
  if (state && state.ok) {
    session = state.session;
    timeLeftValue.textContent = state.timeLeft || "—";
    render();
  }
}

mainBtn.addEventListener("click", async () => {
  clearError();
  mainBtn.disabled = true;
  mainBtn.textContent = NautaI18n.t("statusWorking");
  try {
    const type = session ? "disconnect" : "connect";
    const result = await api.runtime.sendMessage({ type });
    if (!result.ok) {
      showError(result.error);
      if (result.error === "missingCredentials") {
        api.runtime.openOptionsPage();
      }
    } else {
      session = result.session;
    }
  } catch (e) {
    showError(e.message || String(e));
  }
  mainBtn.disabled = false;
  render();
  if (session) {
    refreshTimeLeft();
  }
});

async function refreshTimeLeft() {
  const result = await api.runtime.sendMessage({ type: "refreshTimeLeft" });
  if (result && result.ok && result.timeLeft) {
    timeLeftValue.textContent = result.timeLeft;
  }
}

refreshBtn.addEventListener("click", refreshTimeLeft);
optionsBtn.addEventListener("click", () => api.runtime.openOptionsPage());

(async function init() {
  await NautaI18n.load();
  NautaI18n.apply();
  await refreshState();
})();
