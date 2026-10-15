# Perk Ledger

A private RuPay Select benefits ledger. Buildless HTML, CSS and JavaScript modules, with browser localStorage. Optional private GitHub JSON sync; no backend server, analytics or bank connection. The KMH Next.js app in the parent folder is independent.

## Local preview

From the repository root:

```sh
python3 -m http.server 4178 --bind 127.0.0.1
```

Open **http://127.0.0.1:4178/perk-ledger/**. Alternatively serve this directory and open the server root. Use HTTP rather than `file://`, because browsers restrict JavaScript modules on file URLs. Use a current Chrome, Edge, Firefox or Safari.

Hosted on GitHub Pages at https://anmolkhemuka.github.io/perk-ledger/.

## Shared setup: once per period

Open **Set up RuPay Select benefits**. Enable Spa / Lakmé, Fitness / Cultfit, Healthcare / Thyrocare, Cab / Uber and OTT, choose **Once per quarter** or **Once per year**, optional estimates and provider/use-value defaults, select cards and save. The standard is **one claim per card per period**. There are no normal allowance inputs. These are editable owner tracking preferences, **not verified bank rules**.

Each card retains independent IDs, allowances and history. Spa and Lakmé are provider alternatives within **one Spa / Lakmé entitlement**. Adding a new card inherits enabled templates with checkboxes for exclusions.

Historical allowances never change. Existing rules differing from one remain labelled legacy exceptions and keep their future setting as well. Previous nonstandard shared template allowances are retained as `legacyAllowance`; linked per-card exceptions remain overrides. New cards use the standard one-claim template. Advanced card settings offer an explicit **Use one claim for future periods** choice; it leaves all existing snapshots intact. Editing notes, estimates or shared settings never silently replenishes a consumed period or reduces an old allowance. Historical period allowances are read-only in the UI.

Conflicting rules are preserved, flagged and excluded from new-request availability until reviewed. Retiring an old rule retains history and never releases already-issued overlapping units into a replacement.

## Edit a card

Edit card combines cardholder details, active benefit switches and expandable fee settings. Card artwork/type is selected only when adding a card. Switch a benefit off to stop new requests while preserving history, totals and issued vouchers; switch it back on to restore the same ID and period allowance. Missing shared benefits can be added here too. Shared setup manages defaults; deselecting a template does not remove existing card benefits. Payments and fee history remain accessible from the wallet.

## Portal → voucher → outcome

The Benefits view groups categories into compact card rows labelled with their actual quarter/year. Click Need to request, Awaiting code or Vouchers ready to open a focused status screen. Filter by category and card, sort within each category by deadline/request date or card name, and edit codes or record outcomes directly. Rows show bank, holder, optional last four and the original claim period. Saving an edit updates the underlying status screen immediately. Empty stages explain how to add requests or codes. These screens ignore unrelated search and financial filters; the dashboard card scope is carried into the screen. Financial totals and workflow counts are separate.

| Stage | Meaning / action |
| --- | --- |
| **Not requested** | No active claim reserved. **Mark requested** records the actual request date and optional notes. **Add voucher** can skip directly to code entry. |
| **Requested** | Portal request submitted, awaiting code. Reserves the claim, but is neither a usable voucher nor realised value. **Add voucher** updates this same record. |
| **Voucher ready** | Code received, unused. Stores provider, code, actual received date and independent expiry (blank only if not supplied). **Use / Gift / Sell** opens the existing value workflow. |
| **Used personally / Gifted / Sold** | Completed outcome on the same record. Personal/family actual use value is separate from reference value; each sale uses its actual price and is recorded fully received on the sale date. |
| **Expired** | Issued voucher expired unused. Its claim stays consumed; expiry does not create another entitlement. |

**Need to request**, **Awaiting code** and **Vouchers ready** counts are clickable stage filters. Need-to-request counts current unreserved claims; waiting/ready counts also include outstanding older periods. The per-card filter applies to the workflow counts and grouped list. Financial date filters remain separate.

A request, code and outcome share **one ID and one claim reservation**. Duplicate requests/direct-code creation for a reserved period are blocked. For legacy multi-unit exceptions, the preserved number of units remains available; the UI labels it rather than pretending it is standard.

**Cancel request** records an unsuccessful request in stage history and returns the same record to Not requested. Retrying reuses that ID, not a second entitlement. Only pending requests can be cancelled. **Correct stage** requires confirmation and retains prior request/code/amount details in an audit history. Correcting a completed outcome's stage can change totals, as clearly stated in the form. Outcome edits use **Edit outcome**; voucher details use **Edit voucher**.

Receipt/expiry dates are independent of claim-period boundaries. An older unused voucher remains visible beside the new period's unrequested row, with **Older claim period** and its original quarter/year. No stage is automatically copied to a new period. Vouchers remain usable through their own expiry date; pending requests never expire merely because a quarter ended. Claim deadlines within 14 days and voucher expiries within 14 days receive separate highlights. Near-end unrequested claims also appear in reminders.

Request dates must fall in their claim period. Direct code entry never fabricates a portal request date. Receiving a code after the claim quarter closes is supported and remains attached to the original period. Completion dates cannot precede known voucher receipt dates.

Provider defaults remain Spa ₹2,000, Lakmé ₹1,500, Uber ₹100 and Amazon Prime ₹1,499. Prime gifts can use Brother as the editable recipient nickname. Cultfit/healthcare and all sales require individually confirmed amounts. Defaults never overwrite historical actual values.

## Five dashboard figures

- Personal-use value: confirmed actual personal-use amounts.
- Family / gift value: confirmed actual family-use amounts.
- Sales earnings: received money only. New sales are fully paid; older unpaid portions remain excluded.
- Unused estimated value: known current unrequested allowance estimates plus live ready-voucher estimates, outside realised totals. Pending requests are not counted as usable vouchers. Unspecified estimates are identified in the card note.
- **Total realised benefit = personal use + family/gift value + sales earnings.**

Sold face values never enter personal/family use. Amounts accumulate in integer paise. Older partial sales preserve their exact price and receipts and are flagged for one-time review. Editing defaults to **Keep unchanged — review later**. **Reviewed — keep unpaid amount unchanged** acknowledges the one-time review without adding earnings. Only **I confirm the full sale price has now been received** adds the remainder to earnings. Ordinary edits cannot silently change an unpaid sale's price.

## Card fees and net value

Each **My cards** tile has a **Card fees** section. Cards imported without fee settings show **Fees not set**, not free. Configure joining fee (default ₹0), optional joining paid date, annual fee (blank remains unknown), a directly entered first/next annual due date and notes. **All fee amounts include GST**; the app does not add tax. Free joining and a future annual fee need no joining payment.

Entering a joining paid date records that actual joining amount once. A joining fee without a paid date remains unpaid. An annual due date creates a reminder only. Upcoming and overdue annual fees appear in **On the horizon**. Their dates follow the card's own renewal day, independently of benefit quarters/years.

- **Pay / waive annual fee** asks for actual amount and payment/waiver date. Only Paid amounts reduce net value. Waivers store ₹0 and advance to the next renewal.
- Each occurrence has a stable identity even when rescheduled. Duplicate settlement entries are rejected; a stale payment form cannot pay the next year accidentally.
- **Reschedule annual fee** moves the same occurrence and records the move. Future renewal month/day stays unchanged unless explicitly selected. Fee settings use the same rule when changing an existing due date.
- Annual renewal advances from the occurrence year, not the payment date. Late payment never silently skips missed renewals; settle or waive each occurrence. 29 February renewals use 28 February in non-leap years, retaining the 29 February preference for subsequent leap years.
- **Fee history → Correct entry** changes actual amount, date, outcome or notes on the same ID. It never creates another expense or shifts the next due date. Changing fee settings never rewrites paid history. There is at most one joining occurrence per card.

The dashboard retains **Gross realised benefit** and adds a compact fee summary:

**Net realised value = personal-use value + family/gift value + sales earnings − fees actually paid.**

Personal and family-use values are estimates; sales and paid fees are cash. The UI labels this mixed basis clearly. Waived, scheduled and unpaid fees are excluded from expense totals. A note identifies cards whose fees are not set; their unknown fees are not assumed to be zero expenses.

Every card, including Mother's, shows its annual fee, next due date and all-time fees paid. Expand **Value & fee breakdown** for personal use, family gifts, sales cash, gross value, paid fees and net value. The breakdown applies the dashboard date range to both benefits and fees; its all-time fee total remains separately labelled.

**Summary filters** offers an inclusive From/Through range and card scope. Use/gift value is dated by its outcome date, sales receipts by received date, and fees by payment date. Undated benefit amounts remain in all-time totals but are explicitly excluded from a bounded range. Historical cumulative sales receipts use their recorded last-receipt date; the app does not invent a payment timeline. Unused availability and reminders always reflect the current date. Financial summary filters do not hide voucher history or change schedules.

## Calendar periods and history

Normal setup offers calendar quarters (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec) or calendar years (Jan–Dec), labelled **Q4 2026** or **2026**. Starts are inclusive; next reset dates exclusive. Expiries are valid through the stated local date. Missing periods materialize when the app opens.

Existing snapshot IDs, allowances, dates and values never change when shared settings change. New settings apply to future periods. Advanced **Period history** permits deliberate snapshot corrections and historical entries; actual saved redemption amounts are never revalued.

Existing anniversary configurations continue working. Advanced settings offer a one-time calendar conversion, preserving every existing boundary. Conversion finishes all already-created snapshots. If their end falls inside a calendar period, a zero-allowance transition fragment lasts until the next calendar boundary; then the full configured calendar allowance begins. This conservative transition avoids granting an extra overlapping entitlement. Changing frequency uses the same boundary protection. No anniversary controls appear in normal setup.

Upcoming expiry/reset reminders appear inside the app for the next 30 days. No background notifications are sent.

## Migration, backups and compatibility

The localStorage key remains **`perk-ledger.v1`**. Portal workflow uses **schema version 5**. Imports accept versions **1–5**; exports use version 5. Older application builds cannot read new exports.

Version 1 records preserve every original ID, value, price, receipt, code, date and note. Missing providers, actual use amounts and outcome dates are flagged rather than guessed. Original legacy values remain visible and are not automatically counted as actual use. Version 2 outcomes, historical amounts and partial receipts, and version 3 shared templates, are retained exactly. Old backups do not gain fee settings or transactions automatically. Grouped display infers categories without merging conflicting entitlements. No migration adds transactions. Explicit used/gifted/sold outcomes map to Completed; a saved code supports Ready (or explicit Expired), without inventing a receipt date. Code-less available/claimed/expired records remain Needs review. Review them to confirm the stage and any missing dates. Original status/amount/date fields remain intact.

Before replacing a version 2–4 ledger, the exact old JSON is stored at **`perk-ledger.pre-workflow-backup`**, downloadable in Backup & restore. A recovery-copy failure blocks replacement and shows the existing storage error. Before replacing a version 1 ledger, the original raw JSON is copied to **`perk-ledger.pre-v2-backup`**. If this recovery copy cannot save, the old ledger is not overwritten. **Backup & restore → Download pre-upgrade recovery copy** exports it when present.

JSON import validates IDs, card/benefit/period relationships, dates, allowance counts, amounts, preferences and shared templates before showing counts and requesting replacement confirmation. Failed/cancelled imports preserve current data. Restore does not celebrate. Imports are limited to 5 MB and 20,000 entries per collection; unknown fields are discarded.

Export regularly and keep private JSON backups **outside this repository**. Backups contain card labels, voucher codes, recipients and notes. `.gitignore` excludes JSON, backups, screenshots and local preview state; never force-add private data.

## Local privacy and storage

The ledger stays in this browser profile on this device. Browser storage is not encrypted; clearing it, using private browsing or changing device/origin may lose access. Other scripts on the same origin can access localStorage. Never enter full card numbers, PINs or CVVs.

Save failures show a prominent warning and keep a working copy in memory for export. Unreadable saved storage is not automatically overwritten. Another tab changing the ledger blocks stale saves until reload. Restoring a valid backup or explicitly starting fresh remains available. Transfer between local preview and hosting by exporting and importing explicitly.

## Themes

Both everyday and Diwali themes remain available through **Festive theme**. Its choice uses the separate `perk-ledger.theme.v1` preference and is not included in ledger backups. No festive offers or bonus values are implied.

Static SVG lights, diya and rangoli decoration stay away from figures and controls. Gift, personal-use and fully received sale transitions may show a brief festive confirmation only after successful saving. Reduced motion shows static text. There are no looping animations, flashing lights or sounds.

## Verify

From the repository root (Node 20+):

```sh
node --test perk-ledger/tests/*.test.mjs
node --check perk-ledger/app.mjs
```

Tests cover periods, month-end/leap-year boundaries, values and totals, legacy migration without guessing, recovery copies, shared Spa/Lakmé allowances, family gifts, variable instant-payment prices, legacy unpaid-sale review, shared-template inheritance and overrides, conflict preservation, calendar conversion, unknown estimates, historical values and restoration.

Serve the repository and visit **http://localhost:4178/perk-ledger/tests/browser.html**. Use a separate test origin/profile and close other Perk Ledger tabs on that origin. Choose theme and reduced-motion simulation, then **Run verification**. The real app runs in an iframe with synthetic records and exercises one-claim shared setup, request/code/outcome updates, cancellation and retries, duplicates, older-voucher visibility, expiry, claim-end highlights, legacy allowance/stage review, gifts, variable instant sales, fees, accounting, filters, version 4 migration and version 5 backup restoration, joining fee payments and net totals, confirmation/cancellation, persistence and themes. Unit tests additionally cover versions 1–3, annual fee payments/waivers/rescheduling and date-filtered accounting. It captures export Blobs without downloading synthetic backup files. The prior ledger, theme preference and both recovery copies are restored in `finally`. Do not interrupt a running test. No browser file-upload extension permissions are needed.

## GitHub Pages hosting

All assets and module imports are relative, supporting repository subpaths without a build or base-path setting. Runtime files are `index.html`, `styles.css`, `festive.css`, `redemptions.css`, `fees.css`, `fees.mjs`, `ids.mjs`, `app.mjs`, `core.mjs`, `legacy.mjs`, `preferences.mjs`, `setup.mjs`, `stages.mjs`, `portal.mjs`, `workflow.css`, `visuals.mjs`, `theme.mjs`, `celebration.mjs` and `icon.svg`. Include `.nojekyll` and `.gitignore` when copying the app to another repository. Do not copy private/local preview files or backups.

After review, a dedicated Perk Ledger repository can host these files at its root using **Settings → Pages → Deploy from a branch**, selecting the reviewed branch and **/(root)**. The site will be `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. For this mixed KMH repository, use a separate Pages branch containing only the app's runtime files at its root. GitHub's branch source picker supports root or `/docs`, not arbitrary `/perk-ledger` folders. Keep existing KMH hosting unchanged during review.

References: [Create a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [configure its source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). No deployment workflow has been installed or run.

## Private GitHub sync

The public website source contains no ledger or credentials. **Cloud sync** connects to a separate private repository (default `anmolkhemuka/perk-ledger-data`). Create a fine-grained GitHub token limited to this repository with **Contents: read and write**. Enter it only in Cloud sync on each device. Optional Remember stores it in unencrypted browser storage; otherwise it lasts for that tab session. Credentials never enter exports or source files. Disconnect removes saved credentials and sync metadata, keeping the local ledger.

First export a backup from your existing preview. Import it on the live website. Connect, then choose **Upload this device** once. On other devices connect to the same private repository and choose **Load cloud data**. No initial upload occurs without explicit selection. The repository can be empty initially; the first upload creates `ledger.json`.

After connection and initialisation, successful local saves queue an upload. Opening/focusing the app, returning online and a 30-second check retrieve remote changes. Offline edits remain local. Keep the page open until status says Synced; closing before upload leaves changes pending locally. If both copies change, automatic sync stops: export backups and deliberately choose the copy to retain in Cloud sync. This version detects conflicts rather than merging records. GitHub SHA checks reject stale writes. Every upload creates a private commit. Invalid/expired token or rate-limit errors retain local records and require retry/reconnection.

Cloud data is validated before loading. Loading saves the prior local ledger under `perk-ledger.before-cloud-load`; replacing cloud data saves the previous remote copy locally under `perk-ledger.before-cloud-replace`. These recovery entries can be copied from browser storage; ordinary JSON exports remain the easiest backup. Token settings are not part of backups. No bank connection or background sync after closing the page.


## Visual card selection

Add/Edit card offers BOI, Canara, Utkarsh, BOB Bhoomi and Other picture options. A validated `cardType` ID keeps the artwork independent of nicknames and bank text. Older backups infer recognisable bank names once; unknown banks stay generic until selected. Card IDs, ownership and financial history are unchanged. Wallet tiles combine a small portrait image with bank name and last four digits, then a compact holder/action footer.


## Home-screen app

Use Add to home screen in the page’s privacy panel for installation guidance. iPhone: open in Safari, Share → Add to Home Screen, enable Open as Web App if offered, then Add. Android Chrome may offer Install app; otherwise use its menu. The standalone app has a purple-and-gold gift icon and caches only public app files for offline loading after one successful online visit. GitHub data/API responses and tokens never enter the service-worker cache. Cloud sync needs internet. Browser and installed-app storage can differ: keep a backup and connect the installed app to your cloud copy if records appear empty. Online requests fetch fresh public app files, bypassing the browser HTTP cache; the installed shell is retained only as an offline fallback. The app checks for worker updates on launch, focus, returning to the foreground, reconnecting and every five minutes while visible. A complete downloaded release activates automatically. Existing app pages reload once when safe, postponing while any dialog, failed local save, queued save or cloud sync is active. First installation does not cause a reload. Saved ledger data, tokens and sync settings are never cleared by updates. Future releases must bump the shell cache version in sw.js. A pre-automatic-update version already open on a device needs one normal close/reopen to pick up this new update handler; no separate refresh page is required.


## Automatic fee renewal dates

On new fee setup, a joining/upfront payment date suggests the first annual fee date one year later, even with ₹0 joining fee. You can override the due date or clear it to opt out. Existing renewal schedules remain unchanged unless explicitly edited. Use joining anniversary recalculates the suggestion on demand. The joining date records the entered joining amount once; annual charges remain reminders until confirmed paid/waived. Overdue years are not silently skipped, and February 29 anniversaries return in leap years.
