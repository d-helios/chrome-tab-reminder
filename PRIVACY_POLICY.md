# Privacy Policy

**Tab Reminder** — Chrome Extension
Last updated: October 15, 2026

## Summary

Tab Reminder does **not** collect, store, transmit, or share any personal data. Everything the extension does happens entirely on your own device.

## What the extension does with your data

Tab Reminder lets you close a tab (or a set of tabs) and be reminded about it later, or have it reopened for you at a chosen time. To do that, it stores the following **locally** on your machine, using Chrome's `chrome.storage.local` API:

- The URL and page title of the tabs you choose to snooze.
- The time you selected for the reminder and the action you picked (notify or reopen).

This information never leaves your browser. It is not sent to me, to any server, or to any third party. It is deleted as soon as the reminder fires or you remove it.

## What I collect

**Nothing.** The extension has no analytics, no tracking, no telemetry, no advertising, and no network requests of its own. There is no account, no sign-in, and no backend server.

## Permissions

The extension requests the following Chrome permissions, and each is used only for the features described above:

- `tabs` — to read the URL/title of the tabs you snooze and to reopen them when a reminder is due.
- `alarms` — to schedule your reminders.
- `storage` — to keep your pending reminders locally on your device.
- `notifications` — to show you a reminder notification when it is due.

## Third parties

No data is shared with anyone, because no data is collected. The extension does not embed third-party analytics or ad SDKs.

## Children's privacy

The extension does not collect any data from anyone, including children.

## Changes to this policy

If this policy ever changes, the updated version will be posted in this repository with a new "Last updated" date.

## Contact

Questions about this policy? Open an issue at <https://github.com/d-helios/chrome-tab-reminder/issues>.
