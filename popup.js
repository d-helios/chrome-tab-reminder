const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const CHECK_ICON = 'M20 6 9 17l-5-5';
const X_ICON = 'M18 6 6 18M6 6l12 12';

// Presets: 5m, 10m, 15m, 30m, 1h, 4h, 8h, 24h
const PRESETS = { '5m': 5, '10m': 10, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '8h': 480, '24h': 1440 };

function icon(d, cls = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', `icon ${cls}`.trim());
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

// Custom select that mirrors a native <select> (kept hidden for .value).
function initSelect(select) {
  const wrap = select.closest('.select-wrap');
  const trigger = wrap.querySelector('.select-trigger');
  const valueEl = wrap.querySelector('.select-value');
  const menu = wrap.querySelector('.select-menu');
  let active = -1;

  menu.id = menu.id || `${select.id}-listbox`;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-controls', menu.id);

  const opts = () => [...select.options];
  const items = () => [...menu.querySelectorAll('.select-item')];
  const sync = () => { valueEl.textContent = select.selectedOptions[0]?.textContent.trim() || ''; };

  function setActive(i) {
    const all = items();
    if (!all.length) return;
    active = (i + all.length) % all.length;
    all.forEach((el, idx) => { el.dataset.highlighted = idx === active ? 'true' : 'false'; });
    trigger.setAttribute('aria-activedescendant', all[active].id);
    all[active].scrollIntoView({ block: 'nearest' });
  }

  function close(focus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    if (focus) trigger.focus();
  }

  function choose(i) {
    const opt = opts()[i];
    if (!opt) return;
    select.value = opt.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
    close(true);
  }

  function open() {
    menu.replaceChildren(...opts().map((o, i) => {
      const el = document.createElement('div');
      el.className = 'select-item';
      el.id = `${select.id}-opt-${i}`;
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', String(i === select.selectedIndex));
      const label = document.createElement('span');
      label.textContent = o.textContent.trim();
      el.append(icon(CHECK_ICON, 'check'), label);
      el.addEventListener('mousemove', () => { if (active !== i) setActive(i); });
      el.addEventListener('mousedown', (e) => { e.preventDefault(); choose(i); });
      return el;
    }));
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, select.selectedIndex));
  }

  trigger.addEventListener('click', () => (menu.hidden ? open() : close()));
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (menu.hidden) open();
      else setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
    } else if ((e.key === 'Enter' || e.key === ' ') && !menu.hidden) {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape' && !menu.hidden) {
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab') {
      close();
    }
  });
  document.addEventListener('mousedown', (e) => { if (!wrap.contains(e.target)) close(); });
  sync();
}

initSelect($('scope'));
initSelect($('action'));

const pad = (n) => String(n).padStart(2, '0');
// value format for <input type="datetime-local">, in local time
const toInputValue = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

async function snooze(when, interval_type, raw) {
  if (!when) return ($('status').textContent = 'Could not understand that time. Try “oct 20 at 9am”, “2026-10-20 14:30” or “in 90m”.');
  if (when <= Date.now()) return ($('status').textContent = 'That time is in the past — pick a future date and time.');
  const win = await chrome.windows.getCurrent();
  const res = await chrome.runtime.sendMessage({ windowId: win.id, scope: $('scope').value, close: $('close').checked, action: $('action').value, when, interval_type, raw });
  if (res?.error) $('status').textContent = res.error;
  else window.close();
}

for (const [label, mins] of Object.entries(PRESETS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-outline';
  b.textContent = label;
  b.onclick = () => snooze(Date.now() + mins * 60e3, 'preset', label);
  $('presets').append(b);
}

const nl = () => snooze(parseWhen($('nl').value), 'specific_day', $('nl').value);
$('nlGo').onclick = nl;
$('nl').onkeydown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    nl();
  }
};

// Exact date/time picker: prefilled with a valid future moment so "Set" always works.
const dt = $('dt');
const nextSlot = () => {
  const step = 5 * 60e3; // next 5-minute slot, one hour from now
  return new Date(Math.floor((Date.now() + 3600e3) / step) * step + step);
};
dt.min = toInputValue(new Date());
dt.value = toInputValue(nextSlot());

$('dtGo').onclick = () => {
  if (!dt.value) return ($('status').textContent = 'Pick a date and time first.');
  snooze(new Date(dt.value).getTime(), 'custom', dt.value);
};

async function render() {
  const items = Object.entries(await chrome.storage.local.get(null)).filter(([k]) => k.startsWith('r:'));
  items.sort((a, b) => a[1].target_timestamp - b[1].target_timestamp);
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing scheduled';
    $('list').replaceChildren(li);
    return;
  }
  $('list').replaceChildren(...items.map(([key, r]) => {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'item-info';
    const time = document.createElement('div');
    time.className = 'item-time';
    time.textContent = new Date(r.target_timestamp).toLocaleString();
    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = r.title || r.url;
    title.title = r.url;
    info.append(time, title);

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'btn btn-ghost btn-icon';
    x.title = 'Cancel reminder';
    x.setAttribute('aria-label', 'Cancel reminder');
    x.append(icon(X_ICON));
    x.onclick = async () => {
      await chrome.alarms.clear(r.reminder_id);
      await chrome.storage.local.remove(key);
    };
    li.append(info, x);
    return li;
  }));
}
chrome.storage.onChanged.addListener(render);
render();

chrome.notifications.getPermissionLevel((l) => {
  if (l !== 'granted') $('status').textContent = 'Notifications are blocked for Chrome. Enable them in system settings.';
});
