# Sidequest

A date-based activity finder with editable music and sports preferences, live event-provider adapters, and a saved watchlist. Google Calendar is deliberately deferred.

## Run and deploy

Requires Node.js >=22.

```sh
npm ci
npm start
```

Default port: 3000; respects Render's `PORT`. Render build command: `npm ci`; start command: `npm start`. Deploy the latest `main` commit after pushing changes.

```sh
npm test
```

Eleven tests exercise dates, preference ranking, provider parsing/normalization, upstream failures, and actual HTTP responses with provider fixtures. Local listening sockets are required. Provider fixtures do not establish live upstream availability.

## Event sources

With no Ticketmaster key, the server requests NYC Parks' public XML feed (`https://www.nycgovparks.org/xml/events_3000.xml`), without an API key. This covers NYC public activities, not every concert, professional sports game, restaurant, museum, or ticket release. Feed format and availability must be confirmed in the deployed environment: the development environment's network proxy blocked outbound checks. An unavailable/unreadable source produces an explicit error, never sample events. Only listings with a parseable event date and source link are displayed. Undated RSS publication timestamps are not treated as event dates. A feed with no dated events is treated as unreadable; a readable feed with no events in the selected range produces an empty result.

Optional server environment settings:

| Variable | Purpose |
|---|---|
| `PUBLIC_EVENTS_FEED_URL` | Override with a trusted XML feed compatible with the parser (NYC Parks-style events, RSS items, or Atom entries with explicit event dates). Not a general web scraper. Coverage is still treated as NYC. |
| `TICKETMASTER_API_KEY` | Optional Discovery API key; enables Ticketmaster alongside NYC Parks for broader ticketed-event coverage. Never sent to the browser. |
| `SPOTIFY_CLIENT_ID` | Public Spotify application client ID; enables optional one-time taste import. It is not a client secret. |

No keys are required for the default public-feed adapter. For Ticketmaster, requests search within 25 miles of the ZIP and retrieve up to five pages (1,000 results); the UI warns when capped or partially retrieved. Cancelled, postponed, and off-sale Ticketmaster listings are excluded. The source selector supports all available sources, Ticketmaster only, or Parks only. Each source reports its count or failure independently; Parks failure does not discard Ticketmaster results. A temporary show-all toggle bypasses preference filters without modifying the saved profile, and filter counts explain hidden events. Exact-date searches still honor saved weekdays and event-start hours. Dates use the venue's local event date, with an inclusive user-selected end date. Unknown prices and times are retained and labeled. Listed prices may exclude fees. NYC Parks results cover NYC as a whole, not a calculated radius from the ZIP.

## Preferences

- User-selected dates (up to 366 days), available weekdays, and event-start hours.
- ZIP, budget, transit goal, activity categories, daily/weekly preference.
- Favorite artists/genres and sports/teams boost matching events. They are keyword matches, not inferred AI similarities or guaranteed exact entity matches.
- Comma-separated exclusions hide matching titles, artists, genres, and venues.
- Save event snapshots, dismiss recommendations, restore dismissed events.
- Browser local storage retains preferences and saved snapshots. Old illustrative watchlist entries are removed on migration; they are not represented as real events. No cross-device accounts or synchronization.

Unknown transit times do not falsely pass a one-hour travel constraint: the UI labels every route unverified and states the transit preference is not enforced. Event end times, travel buffers, calendar conflicts, and accessibility details are not evaluated. Manual hours constrain event starts only. Spotify import adds explicit taste data; it does not learn from save/dismiss behavior.

## Spotify setup (optional)

1. Create a Spotify Developer application and check current Spotify eligibility, development-mode, and permitted-user requirements. These may limit who can connect.
2. Add the exact redirect URI `https://sidequest-1zpd.onrender.com/` (including trailing slash), or your actual deployed HTTPS origin with `/`.
3. Add `SPOTIFY_CLIENT_ID` to Render's Environment settings and redeploy. Do not add a client secret: the browser uses Authorization Code with PKCE and the `user-top-read` scope.
4. In Preferences, save your edits, then click **Import from Spotify** and grant permission. Review the imported artists/genres afterward.

OAuth uses a random, expiring state and PKCE verifier in session storage. The token is used transiently to retrieve up to 50 medium-term top artists, then is not retained. Tokens are never put in local storage or sent to this server. Imported artist names and genres remain in the local profile. There is no ongoing Spotify sync. To revoke the app's grant, use Spotify's account app settings. No live OAuth login has been validated in development; it needs a real registered application and eligible account. Spotify documentation access was blocked by the development network proxy.

DICE account integration is not implemented or claimed to be supported. Add DICE artists manually. Never provide account passwords to this app.

## Ticket planning and remaining work

Ticketmaster public on-sale timestamps are shown when supplied, with New York display time and a warning that presales may differ. Rescheduled events are flagged. Sellout risk and day-of availability remain unknown. NYC Parks ticket details link to the organizer; no invented urgency is assigned.

No scheduled notifications, automatic digests, email, Google Calendar, transit routing, authentication, or background monitoring are implemented. The watchlist stores dated snapshots; users must check organizer links for current availability. The daily/weekly setting is retained for future scheduling and does not trigger delivery.

The existing checkout is isolated for cloud tasks: use it directly; do not create a worktree unless requested. After each cloud task starts, run `npm ci` when needed and `npm start`; running processes do not survive a snapshot.
