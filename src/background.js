"use strict";

// Chrome runs this as a service worker → pull in the parser explicitly.
// Firefox loads src/parse.js first via manifest background.scripts.
if (typeof importScripts === "function" && typeof NautaParse === "undefined") {
  importScripts("parse.js");
}

const api = typeof browser !== "undefined" ? browser : chrome;

const BASE_URL = "https://secure.etecsa.net:8443";
const BADGE_COLOR = "#00CCFF";
const TICK_ALARM = "nautaconnect-tick";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function getStored(keys) {
  return api.storage.local.get(keys);
}

async function getSession() {
  const { session } = await getStored("session");
  return session || null;
}

async function setSession(session) {
  if (session) {
    await api.storage.local.set({ session });
  } else {
    await api.storage.local.remove("session");
  }
}

// ---------------------------------------------------------------------------
// Portal client
// ---------------------------------------------------------------------------

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...options,
  });
  return response.text();
}

// GET / and scrape CSRFHW, wlanuserip and loggerId from the login form.
async function fetchLoginPage() {
  let html;
  try {
    html = await fetchText(BASE_URL + "/");
  } catch (e) {
    throw new Error("portalUnreachable");
  }
  const csrfhw = NautaParse.hiddenInputValue(html, "CSRFHW");
  const wlanuserip = NautaParse.hiddenInputValue(html, "wlanuserip");
  const loggerId = NautaParse.hiddenInputValue(html, "loggerId") || "";
  if (!csrfhw || !wlanuserip) {
    throw new Error("portalUnreachable");
  }
  return { csrfhw, wlanuserip, loggerId };
}

async function login(username, password) {
  const page = await fetchLoginPage();
  const form = new URLSearchParams({
    wlanuserip: page.wlanuserip,
    wlanacname: "",
    wlanmac: "",
    firsturl: "notFound.jsp",
    ssid: "",
    usertype: "",
    gotopage: "/nauta_etecsa/LoginURL/pc_login.jsp",
    successpage: "/nauta_etecsa/OnlineURL/pc_index.jsp",
    loggerId: `${page.loggerId}+${username}`,
    lang: "es_ES",
    username,
    password,
    CSRFHW: page.csrfhw,
  });
  // The double slash in //LoginServlet matches the portal form action exactly.
  const body = await fetchText(`${BASE_URL}//LoginServlet`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const uuid = NautaParse.attributeUUID(body);
  if (uuid) {
    return {
      username,
      csrfhw: page.csrfhw,
      wlanuserip: page.wlanuserip,
      attributeUUID: uuid,
      loginDate: Date.now(),
    };
  }
  const alert = NautaParse.alertMessage(body);
  throw new Error(alert || "badResponse");
}

async function logout(session) {
  const query = new URLSearchParams({
    ATTRIBUTE_UUID: session.attributeUUID,
    CSRFHW: session.csrfhw,
    wlanuserip: session.wlanuserip,
    username: session.username,
    remove: "1",
  });
  const body = await fetchText(`${BASE_URL}/LogoutServlet?${query}`);
  if (!body.toUpperCase().includes("SUCCESS")) {
    throw new Error("logoutFailed");
  }
}

async function queryTimeLeft(session) {
  const form = new URLSearchParams({
    op: "getLeftTime",
    ATTRIBUTE_UUID: session.attributeUUID,
    CSRFHW: session.csrfhw,
    wlanuserip: session.wlanuserip,
    username: session.username,
  });
  const body = await fetchText(`${BASE_URL}/EtecsaQueryServlet`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const time = NautaParse.timeString(body);
  if (!time) {
    throw new Error("badResponse");
  }
  return time;
}

// ---------------------------------------------------------------------------
// Badge (elapsed time while connected)
// ---------------------------------------------------------------------------

function formatBadge(elapsedMs) {
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}` : `${minutes}m`;
}

async function updateBadge() {
  const session = await getSession();
  if (session) {
    await api.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    await api.action.setBadgeText({ text: formatBadge(Date.now() - session.loginDate) });
  } else {
    await api.action.setBadgeText({ text: "" });
  }
}

async function syncAlarm() {
  const session = await getSession();
  if (session) {
    await api.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  } else {
    await api.alarms.clear(TICK_ALARM);
  }
  await updateBadge();
}

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK_ALARM) {
    updateBadge();
  }
});

// Re-derive state whenever the worker wakes up.
api.runtime.onStartup?.addListener(syncAlarm);
api.runtime.onInstalled.addListener(syncAlarm);
syncAlarm();

// ---------------------------------------------------------------------------
// Messaging (popup / options)
// ---------------------------------------------------------------------------

async function handleMessage(message) {
  switch (message.type) {
    case "getState": {
      const [session, stored] = await Promise.all([getSession(), getStored("timeLeft")]);
      return { ok: true, session, timeLeft: stored.timeLeft || null };
    }
    case "connect": {
      const { credentials } = await getStored("credentials");
      if (!credentials || !credentials.username || !credentials.password) {
        return { ok: false, error: "missingCredentials" };
      }
      const session = await login(credentials.username, credentials.password);
      await setSession(session);
      await api.storage.local.remove("timeLeft");
      await syncAlarm();
      refreshTimeLeft(); // fire and forget
      return { ok: true, session };
    }
    case "disconnect": {
      const session = await getSession();
      if (!session) {
        return { ok: true, session: null };
      }
      await logout(session); // throws on failure, session stays for retry
      await setSession(null);
      await api.storage.local.remove("timeLeft");
      await syncAlarm();
      return { ok: true, session: null };
    }
    case "refreshTimeLeft": {
      const timeLeft = await refreshTimeLeft();
      return { ok: true, timeLeft };
    }
    default:
      return { ok: false, error: "unknownMessage" };
  }
}

async function refreshTimeLeft() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  try {
    const timeLeft = await queryTimeLeft(session);
    await api.storage.local.set({ timeLeft });
    return timeLeft;
  } catch (e) {
    return null;
  }
}

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
  return true; // keep the channel open for the async response
});
