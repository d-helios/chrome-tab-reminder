// One storage key per reminder ("r:<id>") so concurrent alarms never overwrite each other.
const KEY = (id) => 'r:' + id;

async function all() {
  const items = await chrome.storage.local.get(null);
  return Object.entries(items).filter(([k]) => k.startsWith('r:')).map(([, v]) => v);
}

async function fire(id) {
  const rem = (await chrome.storage.local.get(KEY(id)))[KEY(id)];
  if (!rem) return;
  await chrome.storage.local.remove(KEY(id));
  if (rem.action === 'open') await chrome.tabs.create({ url: rem.url, active: false });
  else await chrome.storage.local.set({ ['n:' + id]: rem }); // keep the URL until the notification is clicked
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Tab reminder',
    message: rem.title || rem.url,
    contextMessage: rem.action === 'open' ? undefined : 'Click to open',
    requireInteraction: rem.action !== 'open',
  });
}

// Re-register alarms and fire anything that came due while the browser was closed.
async function sync() {
  for (const r of await all()) {
    if (r.target_timestamp <= Date.now()) await fire(r.reminder_id);
    else chrome.alarms.create(r.reminder_id, { when: r.target_timestamp });
  }
}

async function snooze({ windowId, scope, close, action, when, interval_type, raw }) {
  const query = { windowId };
  if (scope === 'tab') query.active = true;
  else if (scope === 'selected') query.highlighted = true;
  const tabs = (await chrome.tabs.query(query)).filter((t) => t.url);
  if (!tabs.length) return { error: 'No tabs to snooze' };

  const records = {};
  for (const t of tabs) {
    const id = crypto.randomUUID();
    records[KEY(id)] = {
      reminder_id: id,
      url: t.url,
      title: t.title,
      fav_icon_url: t.favIconUrl,
      target_timestamp: when,
      action,
      interval_type,
      raw_user_input: raw,
      status: 'pending',
    };
    chrome.alarms.create(id, { when });
  }
  await chrome.storage.local.set(records); // persist before closing anything

  if (close) {
    // Closing every tab would close the window; keep it alive with a blank tab.
    if (tabs.length === (await chrome.tabs.query({ windowId })).length) await chrome.tabs.create({ windowId });
    await chrome.tabs.remove(tabs.map((t) => t.id));
  }
  return { count: tabs.length };
}

chrome.notifications.onClicked.addListener(async (id) => {
  const key = 'n:' + id;
  const rem = (await chrome.storage.local.get(key))[key];
  if (!rem) return;
  await chrome.storage.local.remove(key);
  chrome.tabs.create({ url: rem.url });
  chrome.notifications.clear(id);
});
chrome.alarms.onAlarm.addListener((a) => fire(a.name));
chrome.runtime.onStartup.addListener(sync);
chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  snooze(msg).then(reply, (e) => reply({ error: String(e) }));
  return true; // async reply
});
