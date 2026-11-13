# Verify: Core loop: today's feed · spec 0004 · updated 2026-11-13
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. Steps marked (task N) wait until that build plan task lands._

## UI / manual
- [ ] Open `/` with no stored key → setup shows a visible "Secret key" label, a mono input (autocapitalize, autocorrect, and spellcheck off), and "Open today's feed" → AC-9
- [ ] Paste a wrong key → the button reads "Checking…" while the call runs, then error text appears under the field with a 2px error border; reload, still setup → AC-9
- [ ] Paste the right key with spaces around it → the feed opens from the test call with no second `/api/today` request → AC-9
- [ ] Make the upstream fail during setup → the key is saved and the feed shows "Couldn't load today's newsletters." with Retry → AC-9, AC-11
- [ ] Feed: masthead shows today's weekday and day in the phone's locale, plus "Updated <time>" from `generatedAt` in the phone's timezone → AC-10
- [ ] Feed: an item 25 hours old by the phone clock is hidden; an empty day shows "Nothing new today." and "Everything older is in Gmail under Newsletters." → AC-10
- [ ] Feed: every row's link equals its `gmailUrl` → AC-10
- [ ] Background the app and bring it back → `/api/today` is fetched again → AC-10
- [ ] A 401 while reading the feed → setup with "That key stopped working. Paste the current one.", no automatic retry, no Cancel → AC-11
- [ ] A 502 or offline while reading the feed → banner with Retry, rows already loaded stay, exactly one automatic retry after about 2 seconds → AC-11
- [ ] "Change secret key" → setup with Cancel; Cancel returns to the feed with the key unchanged → AC-9
- [ ] Real iPhone walk: a newsletter that arrives shows up as a card after the next timer run; tap opens Gmail (record where it lands); Done returns to the feed intact; wrong key opens setup; a wrong `SCRIPT_KEY` in Vercel shows the banner, not setup → AC-14

## Commands
- [ ] Editor: run `checkDriveAccess` → every step `=ok` under the three pinned scopes → AC-5
- [ ] Editor: run `checkDriveAccess` with one thread carrying only a `Newsletters/` sublabel → record `label:Newsletters threads=N` in `rationale.md` → AC-3 (task 1 finding)
- [ ] Editor: run `onTimer` → log line `outcome=success … bytes=B ms=T`, with no subject, address, ID, or URL in it → AC-7, AC-15, AC-16
- [ ] `curl "$SCRIPT_URL?key=wrong"` → `{"ok":false,"error":"bad_key"}`; with no key → the same → AC-7
- [ ] `curl "$SCRIPT_URL?key=$SCRIPT_KEY"` → a snapshot that passes `isTodaySnapshot` → AC-7
- [ ] `curl -H "Authorization: Bearer wrong" https://<app>/api/today` → 401 with an empty body → AC-8
- [ ] `curl -H "authorization: BEARER $APP_TOKEN" https://<app>/api/today` → 200, `Cache-Control: no-store` → AC-8
- [ ] Set a wrong `SCRIPT_KEY` in Vercel and call `/api/today` → 502 `{"ok":false,"error":"internal"}`; Vercel logs show only `api/today upstream_bad_key` → AC-8
- [ ] `/api/today?refresh=1&key=x` → the upstream URL carries only `key` (from env) and `refresh=1` → AC-8
- [ ] `pnpm test` and `pnpm --filter web test:e2e` pass → AC-8 to AC-11
- [ ] (task 2) Running the same window twice adds no labels; a 3 day old marker catches up oldest first → AC-1, AC-2
- [ ] (task 2) Editor: `listNewsletterHeaders` logs `listId | email | name | count` lines and writes nothing → AC-12
- [ ] (task 2) An invalid category map fails the run before any Gmail or Drive write → AC-13
- [ ] (task 2) Timer with the lock held logs `skipped_busy` → AC-6
- [ ] (task 3) Relabel: moving a sender from Unsorted to a category swaps the in window thread's sublabel and leaves the parent label → AC-4
- [ ] (task 3) Publish: pointer swap reconciled by reread; cleanup spares current, previous, and files under 1 hour old → AC-5
- [ ] (task 3) `refresh=1` with nothing new returns the current snapshot; with the lock busy returns the current snapshot → AC-7
- [ ] (task 3) A snapshot over 4MB fails `snapshot_too_large` and publishes nothing → AC-15
- [ ] (task 5) A day of run durations checked against the 30 second average → AC-16

## Value sourcing
- [ ] `since` window start: set `lastProcessedAt` to 3 days ago → the run plans from that time minus 15 minutes; 9 days ago → floored at 7 days with `gap_capped` (task 2)
- [ ] Newsletter or not: a message whose `List-Unsubscribe` is only spaces is never labeled or listed
- [ ] Category: a message whose `List-Id` is mapped and whose sender maps elsewhere takes the `List-Id` category (task 2)
- [ ] New marker: a run cut short by its budget sets the marker to the last completed message's date (task 2)
- [ ] `generatedAt`: equals the worker clock after the candidate search, and every item is within 24 hours before it
- [ ] `id`, `threadId`, `receivedAt`, `subject`: match the Gmail message for one known newsletter
- [ ] `sender`, `senderEmail`: `"Notes, Daily" <Notes@Example.com>` gives `Notes, Daily` and `notes@example.com`; `<a@b.c>` gives the address as the name
- [ ] `listId`: `Notes <notes.example.com>` gives `notes.example.com`; no header gives `null`
- [ ] `content`: an Unsorted item is `{ kind: "none" }` and its body getter is never called; a mapped HTML issue carries its HTML (task 2 map)
- [ ] `gmailUrl`: equals `https://mail.google.com/mail/u/0/#all/` plus the thread ID
- [ ] Desired sublabels per thread: the categories of the thread's in window newsletter messages only (task 3)
- [ ] `snapshotFileId`, `previousSnapshotFileId`: new file ID and prior pointer after a publish (previous pointer in task 3)
- [ ] Cleanup file age: a file created 59 minutes ago survives cleanup (task 3)
- [ ] Snapshot bytes: the logged size equals the UTF-8 length of the published file
- [ ] Setup token: the pasted value with surrounding spaces and a newline is trimmed before the test and the save
- [ ] Header helper display name: the most frequent name per (List-Id, address) pair (task 2)
- [ ] `doGet` snapshot: change `snapshotFileId` by hand to an older file → `doGet` serves that file
- [ ] Proxy upstream URL and key: come only from `env.scriptUrl` and `env.scriptKey`; a missing one stops the server at start
- [ ] Proxy expected token: from `env.appToken`; change it in Vercel → the old phone key gets 401
- [ ] Phone bearer: the token read from IndexedDB `appToken` (check in Web Inspector on the phone)
- [ ] Masthead date: set the phone to another locale and timezone → the date follows the phone, not the server
- [ ] "Updated <time>": shows `generatedAt` in the phone's timezone
- [ ] Visible items: set the phone clock 2 hours behind → no new item is hidden (lower bound only)
- [ ] Row time: `receivedAt` formatted by `IssueRow` in the phone's timezone
- [ ] Row link: every row, mapped or Unsorted, links to `gmailUrl`
- [ ] Setup error text: only a 401 shows it; a 502 never does

## Acceptance-criteria coverage
- AC-1, AC-2, AC-12, AC-13: task 2 steps · AC-3: candidate and Value sourcing steps (full in task 3) · AC-4: task 3 · AC-5: Drive check plus task 3 publish · AC-6: task 2 lock plus task 3 hard stop · AC-7: curl steps plus task 3 refresh · AC-8: proxy curl steps · AC-9: setup steps · AC-10: feed steps · AC-11: error steps · AC-14: real iPhone walk · AC-15: run log plus task 3 size · AC-16: run log plus task 5 durations
