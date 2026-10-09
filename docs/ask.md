# Ask in plain words

The menu and `/` terminal use the existing project/crew catalogue and launcher. Exact terminal commands and six fixed suggestion chips work in plain code. All other text goes to `POST /api/ask`; Jev chooses an action and the site supplies its own written answer. There is no generated prose, model-selected URL or arbitrary command execution.

PS5 touchpad click opens Ask with chips focused. D-pad moves, Cross chooses, Circle returns; the text field stays hidden for pad input. Touch or a keyboard restores a normal text input. On iPhone, tapping Ask focuses that input synchronously so the iOS keyboard and its own dictation mic are available. The app does not request microphone access.

## Fixed actions

`src/ask/actions.js` derives 123 actions from `src/projects.js`: `play:<cmd>` for all 18 projects/sites and their editions; `play:<cmd>:<num>` for each listed cast member; `crew:<num>`, `crew-games:<num>` and `crew-model:<num>` for each of the eight crew; `crew`, `crew-license`, `contact`, `tip`, `music:on`, `music:off`, `menu` and `none`. Games without a verified `asParam: true` open normally. Verified support adds `?as=<num>` while preserving existing query/fragment and the PWA phone flag. The original project object stays in the player so returning selects the correct cartridge/edition.

Responses contain only `{action, line}` or `{action: null, line, suggestions: [{action, line}, ...]}`. Suggestions contain exactly three known actions ranked by probability. The client validates the action and authored line again and supplies the button label locally.

Automatic execution requires both Jev confidence **at least 0.85** and winning probability **at least 0.75**. Every other valid distribution yields three suggestions with no automatic action. A confident `none` reports no match. The production parser rejects missing/unknown options, invalid probabilities, a nonwinning choice and malformed confidence. These are application thresholds, not guarantees of model correctness; the recorded live probe covers only the overlapping zombie editions.

## Server and spending limits

The only function is `api/ask.js`. Set **TYPESAFE_API_KEY** server-side in Vercel; never prefix it with `VITE_`. A shared Upstash Redis REST store is also required: **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**. This avoids resetting limits on Vercel cold starts or splitting them between instances. No storage credentials means a polite plain-code fallback without a provider call. No deployment or project environment changes are part of this branch.

The trusted `x-vercel-forwarded-for` header supplies the client network. IPv6 addresses group by /64, IPv4-mapped addresses group with IPv4, and HMAC buckets keep addresses out of Redis keys. One atomic Lua reservation checks all limits before any inference:

- Per network: 6 calls per fixed minute and 60 per UTC day.
- Globally: 400 calls and 2,000,000 conservatively reserved input tokens per UTC day.
- The complete UTF-8 request size plus 1,024 framing tokens is reserved before calling Jev. Failures/timeouts consume that reservation; there are no refunds or retries. Output tokens are not charged by the provider and are not part of this input budget.
- Counters expire at their window boundary. All four keys share a Redis hash slot. Fixed windows permit a burst across a reset.
- Input: a single `text` property, 200 Unicode characters, 1,024 input bytes, 2,048-byte HTTP body ceiling. Normalize Unicode/whitespace and strip controls, bidirectional format characters and angle brackets; reject empty/nontext/oversize input.
- Timeouts: 2 seconds for Redis, 8 for Jev, 12 in the client, 15 for the function. Missing key/store/network, exhausted quota, malformed answers and provider errors all fall back. API responses use `Cache-Control: no-store`; the existing PWA worker never caches API requests.

Only literal command names and the written chip labels match locally. A chip never calls Jev. Offline crew, music and menu actions remain usable; launching an uncached game still needs a network connection, as the PWA already explains. Opening Tip only opens the existing jar; it never sends money. Closing Ask/terminal or issuing a newer terminal command cancels pending inference so a late reply cannot launch a game.

## Checks

`npm test` uses recorded Jev answers and synthetic malformed/uncertain boundary cases; it never makes a live provider call. Set `REDIS_SERVER_BIN` to a local Redis executable and `TMPDIR` to the smoke scratch directory to include the real Redis concurrency/expiry tests. Without that executable, the optional Redis integration test is explicitly skipped.

After building, `scripts/smoke-ask.mjs` runs desktop Chromium and Playwright's iPhone 16 Pro WebKit descriptor using the actual HTTP handler and local Redis. Jev answers replay from `test/fixtures/ask-recorded.json`; game iframes use fixtures to verify launcher URLs without running game simulations. `--live` records a small three-option zombie-edition probe, not a calibration of all 123 choices. Set `PLAYWRIGHT_MODULE` when Playwright is installed outside the repository. Both browsers are headless/muted, use throwaway profiles under the smoke TMPDIR, and stop child processes by recorded PID. There are two screenshots.

`scripts/check-ask-bundle.mjs` rebuilds with the local server credential in the environment and greps `dist` for that credential and server-only identifiers without printing them. Run it under `nice -n 10` with the required TMPDIR. Physical Bluetooth, the iOS keyboard's dictation UI and hosted game rendering still need device checks.

API contracts used: [TypeSafe HTTP/Choice](https://docs.typesafe.ai/api), [confidence](https://docs.typesafe.ai/confidence), [function calling](https://docs.typesafe.ai/cookbooks/function_calling), [Vercel network headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for), [Upstash REST](https://upstash.com/docs/redis/features/restapi).
