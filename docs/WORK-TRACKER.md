# Task and journal integration

## Architecture and implementation plan

The existing app is an Electron shell (`main.js`, isolated `preload.js`) around a
single HTML page. `script.js` manages an end-time-based timer, theme/settings
modals, statistics, notifications and mini mode. localStorage holds settings,
daily cycle/count, date/minute history, and running timer recovery. There is no
router or component framework; reuse the existing modal, button and palette CSS.

Add `work-tracker.js` for persistence, task operations, journal date ranges and
exports, and `tracker-ui.js` for the board, task editor/history, journal and
completion form. Add task selection to the timer and two utility buttons. Keep
timer phase transitions, notifications, statistics and mini mode in `script.js`.

The versioned `pomodoro_work_tracker` envelope stores `tasks`, `sessions`, and
`pendingSessionId` together so saving session notes and completing its task is
one localStorage write. Tasks contain id, title, description, status, createdAt
and completedAt. Sessions contain id, taskId, taskTitle (historical snapshot),
startedAt, completedAt, duration (seconds of focus, excluding pauses), notes and
taskCompleted (a historical event). Task counts/time/history are derived from
sessions; deleting or renaming a task never deletes or rewrites its sessions.

Migrate all existing history on first use, retain the original key as a legacy
backup, and stop truncating history. Keep a previous envelope backup; refuse
to overwrite malformed/unsupported storage. Automatically save a completed
session before requesting optional notes, persist the pending form for restart,
and use its stable runtime ID to prevent duplicate completion recovery.

Journal filters use local completion dates and Monday-based weeks. Day/week/month
navigation and custom/all exports operate on the same canonical sessions.
Markdown groups by date and task; CSV quotes every field and protects spreadsheet
formula prefixes; JSON provides a machine-readable session export. Exports use
an Electron Save dialog, with a browser download fallback. No new dependencies.

## Usage and verification

Use **Tasks** to add a task, change its column with the status picker, or open its
title to edit the description and see all session notes. **Focus on this** selects
the task on the timer. The selection is locked once a session starts (including
pauses); reset/skip abandons the session without logging completed focus time.
Duration remains the original timer duration even if settings change mid-session.
Running and paused timers preserve their task snapshot through restart.

Completion saves the session immediately. The completion dialog lets you attach
or change its task, write optional notes, and mark the task completed. Closing the
dialog also saves its fields. An unfinished completion dialog is reopened after
restart. Journal **Edit notes** also preserves historical completion events;
reopening a task does not rewrite those events or re-complete it when notes change.

The Journal date picker and previous/next buttons browse local day, Monday-based
week, or calendar month. Expand **Export journal** to choose selected day/week/
month, inclusive custom dates, or all history and a Markdown/CSV/JSON file.
Statistics use the canonical sessions rather than the old history key. Daily
cycle/count storage remains a compatibility cache for the existing timer.

Persistence remains local to the existing Electron user-data profile. The store
is a single versioned envelope to make task completion plus session annotation
atomic, at the cost of rewriting that envelope on each edit. There is no history
limit. Previous valid data is copied to `pomodoro_work_tracker_backup` before
each successful save. Invalid primary storage is preserved and shown as read-only;
a valid backup remains available for journal exports. A full store reports an
error and retains the running-session identity so completion can be retried.

Legacy records cannot supply notes or task links. Old date-only records use noon
on that local date; missing durations use the saved work setting (or 25 minutes).
Legacy start times are inferred from completion time minus duration. The original
`pomodoro_history` remains untouched after migration.

`node node_modules/@playwright/test/cli.js test` runs the real Electron tests in
isolated temporary profiles. Coverage includes existing timer/theme/mini behavior,
task create/edit/move/reopen/delete, linked and unassigned completion, notes and
historical snapshots, paused/running restart, interrupted completion recovery,
offline completion dates and duplicate prevention, migration of 1,005 records,
corrupt/full storage, date boundaries, formula-safe CSV, and saving all three
formats for every supported export scope through the native export handler.

## Desktop experience update

`desktop-ui.js` assembles a persistent navigation sidebar, timer dock, and workspace
pages from the existing controls. Focus adds a CSS plant illustration, daily
totals and upcoming tasks. Tasks, Journal, Stats and Settings use inline workspace
pages; only task details and session annotations remain modal dialogs. Navigation
remembers its last page in `pomodoro_view` and preserves each page's scroll position
within the current run. Ctrl+1–5 switches pages; Alt+Left returns to the prior page.
Timer shortcuts do not interfere with typing, task editors, or workspace pages.

CSS adapts to wide desktops, shorter screens, and compact windows. On narrow
windows navigation sits at the top and the timer becomes a horizontal strip.
Task cards support drag grips and text search while retaining accessible status
menus. The main Electron window is resizable/maximizable and remembers bounds in
`window-state.json` under its existing user-data directory. Saved bounds are fitted
to the available screen on launch. Tiny timer stays on top, keeps its compact size,
and restores the previous normal bounds/maximized state on expansion.

The same themes and work-store schema continue to apply; this change does not
migrate or rewrite task/session data. Electron regression coverage additionally
checks inline navigation, timer availability during page changes, search/dragging,
multiple window widths, remembered bounds/page, and mini-mode restoration. Visual
QA captures light, dark, wide and compact layouts.
