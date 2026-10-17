# Admin notices

Implemented on `codex/admin-notices`, based on `dev` at `0f8f7ce`. **Do not merge into dev until the user asks.**

## Run it

1. While on the feature branch, apply its additive database migration in `server/`: `bun run db:deploy` (or `bun run db:migrate` for local development). This adds `notices` and `notice_reads`; it was not applied during implementation.
2. Restart the server and the admin dev server. Reload the mobile app through Metro. There are no new dependencies or native changes, so a native rebuild is not needed.
3. In the admin, open **Notices** (sidebar or `G`, then `N`), or open a student's detail page and choose **Send notice**.
4. Choose everyone or search for a student by name/email. Enter a title (120 characters maximum) and plain-text message (2,000 characters maximum). Review the recipient and preview, then send.
5. In the app, use the inbox button on Home or **Profile → Inbox**. Opening a notice marks it read. Dismissing its banner hides that banner for the current sign-in/launch; it stays unread in the inbox.

## Delivery and storage

- Only verified, signed-in students use the student API. The existing Firebase admin claim protects composing and sent history. No tokens are put into URLs.
- Notices and individual read receipts live in PostgreSQL. Broadcast notices are visible to all signed-in students, including users who open the app later; targeted notices are visible only to their recipient. Missed notices remain in the inbox. There are no OS notifications or closed-app/background delivery.
- An authenticated `expo/fetch` SSE connection runs only while the app is active. It is closed during mic check, a live session (including paused/reconnecting), and scoring. Returning to a normal screen refreshes the inbox and reconnects. No banner appears during practice.
- An in-process send triggers an immediate inbox invalidation. One shared scan per server every two seconds covers notices and read receipts written through another instance, rather than polling once per phone. The scan runs only while subscribers exist and reads the latest 200 notice and receipt rows. At a volume exceeding that between scans, use a durable change feed/outbox instead; a reconnect always refreshes the inbox independently of the scan.
- SSE frames contain only `sync`, never the message, user identifiers or credentials. The REST inbox query enforces the audience. Connections end after a minute and reconnect with a current Firebase token, bounding access after account revocation; heartbeat comments run every 15 seconds. Reconnect errors back off to 30 seconds.
- The mobile store ignores responses from an earlier account, shares in-flight requests, merges paginated results and retains older loaded items on refresh. The inbox loads 30 notices at a time; admin history loads 25.
- The composer retains a request UUID when retrying an uncertain send. The server accepts the same admin/content/audience once, rejects reuse with changed content, and records `notice_sent` in the existing audit log in the same transaction. Sending is limited to 10 requests/minute per admin.
- Sent history shows **Read by**, which counts explicit read receipts, not delivery, online status, or student acknowledgement.
- Account deletion cascades private notices and the student's read receipts. Shared broadcasts and admin audit records remain. Profile's JSON export includes accessible notices and the student's read timestamps.

## Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/admin/notices?page=1` | Admin | Sent history and read counts |
| POST | `/admin/notices` | Admin | `{ id: UUID, title, body, targetId: UID or null }` |
| GET | `/notices?before=UUID` | Verified student | Own inbox page, unread count, next cursor |
| POST | `/notices/:id/read` | Verified recipient | Idempotent read receipt; another student's private ID returns 404 |
| GET | `/notices/stream` | Verified student | SSE inbox invalidations |

The normal `/api` prefix is supported. Keep streaming unbuffered in any reverse proxy (`text/event-stream`, no transform/cache; the response includes `X-Accel-Buffering: no`). A healthy stream writes its first frame immediately. Test through the actual tunnel/host before merging, as proxy buffering can delay events.

## Validation completed

- Prisma client generated and schema validated; migration not applied to the user's database.
- Server type check and 62 unit tests passed (notice audience/validation/idempotency policy and hub routing included).
- Mobile type check, Expo lint and 93 unit tests passed (SSE chunk boundaries, account switching, pagination and failed read recovery included).
- Admin type check and lint passed. Production build passed with bundled Node and `next build --webpack`; default Turbopack hit a CSS-worker subprocess failure on this host. No build configuration was changed.
- Local HTTP smoke: health 200; unsigned inbox, stream and admin notice reads 401. This used an unreachable test database URL and sent no notices.

## Acceptance checks still to run

Use disposable student accounts; avoid broadcasting test text to real students. Run broadcasts in an isolated test database/environment.

- [ ] Apply the migration to a test database and open the admin as an actual admin.
- [ ] Send a private notice to student A; see its banner promptly and find it in A's inbox. Student B must see neither the notice nor its unread count; an attempted read with A's notice ID must return 404.
- [ ] Send a broadcast; both test students see it. Reopen the app after a missed notice and verify it is fetched.
- [ ] Read a notice, refresh/relaunch and verify its read state and admin read count. Confirm banner dismissal alone leaves it unread.
- [ ] Send during mic check, presentation, Q&A, pause/reconnect and scoring. Nothing interrupts the practice; the notice appears after returning to a normal screen.
- [ ] Background/close the app: no OS notification; return and catch up. Drop/recover the network and check retry without restarting the app.
- [ ] Switch accounts while an inbox request is in flight; no previous account's message appears. Load more than 30 notices, read an older one and receive a new notice without losing the older rows.
- [ ] Retry an uncertain send and confirm one stored notice and one audit row. Confirm a student token cannot POST `/admin/notices`.
- [ ] Check two server processes against the test database and the actual proxy for cross-instance updates and unbuffered SSE.
- [ ] Check inbox scrolling, expanded long messages, large font sizes, banner close target and safe-area placement on the phone.

These are feature acceptance checks, not a claim of completed device or database integration testing.
