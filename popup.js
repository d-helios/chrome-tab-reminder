const $ = (id) => document.getElementById(id);
const PRESETS = { '5m': 5, '10m': 10, '20m': 20, '30m': 30, '1h': 60, '4h': 240, '6h': 360, '8h': 480 };

async function snooze(when, interval_type, raw) {
  if (!when || when <= Date.now()) return ($('status').textContent = 'Could not understand that time, or it is in the past.');
  const win = await chrome.windows.getCurrent();
  const res = await chrome.runtime.sendMessage({ windowId: win.id, scope: $('scope').value, close: $('close').checked, action: $('action').value, when, interval_type, raw });
  if (res?.error) $('status').textContent = res.error;
  else window.close();
}

for (const [label, mins] of Object.entries(PRESETS)) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => snooze(Date.now() + mins * 60e3, 'preset', label);
  $('presets').append(b);
}

const nl = () => snooze(parseWhen($('nl').value), 'specific_day', $('nl').value);
$('nlGo').onclick = nl;
$('nl').onkeydown = (e) => e.key === 'Enter' && nl();
$('dtGo').onclick = () => snooze($('dt').value && new Date($('dt').value).getTime(), 'custom', $('dt').value);

async function render() {
  const items = Object.entries(await chrome.storage.local.get(null)).filter(([k]) => k.startsWith('r:'));
  items.sort((a, b) => a[1].target_timestamp - b[1].target_timestamp);
  $('list').replaceChildren(...items.map(([key, r]) => {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.textContent = `${new Date(r.target_timestamp).toLocaleString()} – ${r.title || r.url}`;
    s.title = r.url;
    const x = document.createElement('button');
    x.textContent = '✕';
    x.onclick = async () => {
      await chrome.alarms.clear(r.reminder_id);
      await chrome.storage.local.remove(key);
    };
    li.append(s, x);
    return li;
  }));
}
chrome.storage.onChanged.addListener(render);
render();

chrome.notifications.getPermissionLevel((l) => {
  if (l !== 'granted') $('status').textContent = 'Notifications are blocked for Chrome. Enable them in system settings.';
});
