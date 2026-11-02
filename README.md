# Sidequest

A first activity-planning prototype: preference survey, editable settings, a personalized in-app digest, and a saved ticket watchlist.

## Run

Requires Node.js 22 or later. No third-party runtime dependencies or API keys are needed.

```sh
cd /workspace/ubiquitous-broccoli
npm start
```

The server uses port 3000 by default; set `PORT` to change it. `npm run dev` restarts the server when server files change. Refresh the browser to see frontend edits.

```sh
npm test
```

Tests cover preference validation, filtering (including round-trip travel within the available time window), and real HTTP responses. The test environment must permit local listening sockets.

## Available now

- First-run survey and editable preferences: ZIP, interests, budget per person, transit limit, daily/weekly digest preference, days, and hours.
- Defaults: 11201, public transit only, 60 minutes each way, $200, weekly digest.
- Sample recommendations filtered by interests, budget, illustrative transit time, and manual availability.
- Save/remove watchlist, dismiss ideas, restore dismissed ideas.
- Preferences and saved/dismissed IDs persist in this browser's local storage. There is no account or server-side profile storage.
- Responsive layout, labeled forms, and keyboard-operable native controls.

## Prototype boundaries

All six activities are illustrative NYC concepts, not actual upcoming listings. Prices, schedules, and transit times are examples. They have no real dates or purchase links. The ZIP is stored as a preference but does not perform geocoding or change the sample geography. Booking notes describe general considerations, not verified event-specific sellout predictions. There is no live discovery, AI inference, route calculation, automatic scheduling, background ticket monitoring, notification delivery, email, or Google Calendar integration. Daily/weekly is a saved preference only; digests are filtered on opening the app.

No Google credentials are requested or collected. Calendar availability currently uses manually selected days and hours, not actual calendar events. Font loading optionally uses Google Fonts; system fonts work offline.

## Next implementation milestones

1. Add a live-event provider behind the server, with source URLs, actual event dates, last-checked timestamps, pricing including known fees, and deduplication. Keep missing facts explicit.
2. Add transit routing from the configured ZIP and event location for the actual travel date; treat unknown travel time as unknown rather than assuming eligibility.
3. Add Google Calendar OAuth through a Google Cloud project with configured redirect URIs and minimum read-only availability scope. Store tokens securely on the server, never in local storage; implement disconnect and revocation handling.
4. Add persistent profiles and a background scheduler for dated digests, ticket-release checks, timezone-aware reminders, retry handling, and notification deduplication. Show verified sale timestamps separately from estimated urgency.
5. Add authenticated accounts before sharing this application publicly or storing personal calendar data.

The existing checkout is already isolated for cloud tasks; use it directly rather than creating a worktree unless requested.
