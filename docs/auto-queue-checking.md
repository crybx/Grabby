# Auto-Queue Update Checking

This document describes the scheduled check that decides whether tracked
stories get queued for automatic chapter checking (the "auto-queue" feature).

## Where it lives

The scheduled check is implemented in **`modules/story-update-checker.js`** in
the `StoryUpdateChecker` class.

It is wired into the service worker in **`background.js`**:

- The `chrome.alarms.onAlarm` listener routes the `"storyUpdateCheck"` alarm to
  the checker.
- `StoryUpdateChecker.initialize()` is called during background startup.

## How it's scheduled

The check uses the `chrome.alarms` API, not `setInterval`.

`initialize()` (lines 13-24) clears any existing alarm and creates a recurring
alarm named `"storyUpdateCheck"`:

```javascript
await chrome.alarms.create(this.alarmName, {
    delayInMinutes: 1,                          // First check after 1 minute
    periodInMinutes: this.checkIntervalMinutes  // Then every 10 minutes
});
```

- **First check:** 1 minute after the extension starts.
- **Repeat interval:** every 10 minutes (`checkIntervalMinutes = 10`).

The interval can be changed at runtime via `updateSettings()`, which restarts
the alarm with the new value.

## What runs on each tick

`performCheck()` (lines 140-201) loads the latest auto-queue settings and the
tracked stories, finds eligible stories via `isEligibleForUpdate()`, sorts them
oldest-`dateLastChecked`-first, and adds them to the queue with
`queueManager.addToQueue()`.

## When a story gets queued

A story is queued only if **all** of the following are true:

1. **Auto-queue is enabled** — `autoQueueEnabled` is not `false`
   (`performCheck`, line 146).
2. **Tracker is visible, or background mode is on** — the story tracker page
   must be the active tab, unless `autoQueueBackground` is enabled
   (`performCheck`, lines 151-157).
3. **Story has a last chapter URL** — `story.lastChapterUrl` is set
   (`isEligibleForUpdate`, line 81).
4. **Stop point not reached** — if `story.stopAt` is configured, the story's
   `lastChapterTitle` must not match it (`isEligibleForUpdate`, lines 87-89).
5. **An interval applies** — there is an interval to check against. A per-story
   `checkIntervalDays` takes precedence; if it isn't set, the domain extracted
   from the URL must have an entry in `autoQueueSettings`. If neither is set,
   the story is not eligible (`isEligibleForUpdate`).
6. **Enough time has passed** — hours since `dateLastChecked` is at least the
   resolved interval, i.e. `hoursSinceLastCheck >= daysInterval * 24`, where
   `daysInterval` is the per-story `checkIntervalDays` when set, otherwise the
   per-domain value (`isEligibleForUpdate`).
7. **Not already in the queue** — the story is not currently processing,
   queued, or (while the queue is still active) completed
   (`isStoryInQueue`, called from `performCheck`, lines 172-174).

The per-story override is set in the story tracker's add/edit form ("Check
Interval (days)") and stored on the story object as `checkIntervalDays`
alongside `stopAt` and `lastChapterUrl`. When set, it both supplies the
interval (overriding condition 6) and removes the need for a domain entry
(bypassing the domain requirement in condition 5).

Eligible stories are sorted by oldest `dateLastChecked` first, then added via
`queueManager.addToQueue()` (`performCheck`, lines 187-194).
