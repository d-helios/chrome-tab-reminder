# Tab Reminder

A tiny Chrome extension (Manifest V3): close tabs now, get them back — and a
notification — at a time you choose.

## Features

- **Presets** — snooze for 5m, 10m, 15m, 30m, 1h, 4h, 8h or 24h.
- **Natural language** — type things like `next monday at 9am`, `tomorrow at 8`,
  `in 2 hours`, `noon`, `eod`, or an exact date such as `oct 20 at 9am`,
  `2026-10-20 14:30`, `20.10.2026 09:00` (`20/10` or `10/20` are read
  day-first when ambiguous).
- **Date/time picker** — pick an exact moment (prefilled with a valid future time).
- **Scope** — this tab, the selected tabs, or the whole window.
- **Optional close** — close the tab(s) right after the reminder is set.
- **When due** — either just notify you (click to open) or reopen the tab
  automatically and notify.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the root of this repository.
4. Pin the extension and click its icon to open the popup.

## Build

Requires [Task](https://taskfile.dev/) and Google Chrome.

```sh
task build   # dist/tab-reminder-v<version>.zip
task crx     # dist/tab-reminder-v<version>.crx (signed)
```

- `task build` — ZIP with `manifest.json` at the root, for stores that accept ZIP uploads.
- `task crx` — signed CRX3, required for Chrome Web Store items opted into
  **Verified CRX uploads** (`You must update your item with a crx package`).

The CRX is signed with `keys/tab-reminder.pem` (override with `CRX_KEY=/path/key.pem`).
For verified uploads, the matching public key must be registered in the Developer
Dashboard under **Package → Verified CRX Uploads**:

```sh
task keygen   # create keys/tab-reminder.pem (never commit it)
task pubkey   # paste this output into the dashboard
```

Keep the private key safe — the Web Store only accepts updates signed by it.

## Project layout

```
manifest.json      Extension manifest (MV3)
background.js      Service worker: alarms, storage, notifications
             popup.html / popup.js    Popup UI
parse.js           Natural-language time parser
icons/             Extension icons (16 / 48 / 128 px)
Taskfile.yml       Build tasks (zip / signed CRX)
PRIVACY_POLICY.md  Privacy policy
```

## Privacy

This extension collects no data. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## License

All rights reserved.
