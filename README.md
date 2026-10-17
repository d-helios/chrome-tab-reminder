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

The CRX is signed with the private key stored in passage at
`local/chrome_dev/ca.pem` (override with `CRX_KEY=/path/key.pem`). Passage may
ask you to unlock it. `task pubkey` prints the matching public key
(`local/chrome_dev/ca-public_key.pem`); it must match the public key registered
in the Developer Dashboard under **Package → Verified CRX Uploads**, otherwise
the store rejects the upload.

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
