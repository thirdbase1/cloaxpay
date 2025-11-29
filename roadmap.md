# MVP Roadmap — CloaxPay (step-by-step)

---

## Phase 0 — Prep (foundation before code)

### Decisions & scope
- Confirm MVP scope: Inline widget + Merchant API + Basic dashboard + SideShift integration + Admin unresolved pool + Email notifications.
- Decide supported chains/tokens for v1 (pick 3: e.g., SOL, ETH (EVM), BSC/Polygon).
- Finalize default fee model (percentage + flat).

### Design brief
- Create UI kit: color palette, typography, buttons, microcopy rules (clear warnings).
- Wireframes for widget, merchant dashboard, admin panel, transaction detail.

### Infra & accounts
- Create SideShift test/live accounts and API access.
- Provision core infra (hosting, DB, monitoring, HSM/keys for admin wallet).

### Security checklist
- Secrets management plan, webhook HMAC plan, rate limits, logging policy.

**Deliverables:** Scope doc, UI kit, wireframes, SideShift credentials, infra plan.

---

## Phase 1 — Core API + Auth + Keys

### Auth & keys
- Implement merchant accounts, PK/SK issuance (pk_live/test, sk_live/test).
- Merchant dashboard: view keys, regenerate, webhook config.

### Core endpoints
- POST /payment/deposit (create session) — returns tx id + deposit address.
- GET /payment/verify/{id} (status).
- POST /webhook/receive (incoming chain events handler).

### DB entities
- Merchants, Sessions, Transactions, Unresolved pool, Batches, API keys.

### Admin UI (basic)
- Transaction list, unresolved queue, merchant profiles.

### Testing
- Unit tests for auth, key issuance, and session creation.

**Deliverables:** Auth system, deposit/create API, basic admin UI, tests.

---

## Phase 2 — Inline Widget + Merchant Integration

### Widget
- Secure JS embed accepting widget_url + public_key.
- UI: deposit address, chain label, QR, copy button, amount, merchant contact, warnings, "I HAVE PAID" button.
- Polling + optional auto-detect integration with backend.

### Merchant flow
- Example merchant server code (Node/Express) showing POST /payment/deposit with sk header.
- Quickstart docs + one-click copyable snippet.

### UX polish
- Mobile-first widget, accessible focus states, retry/resend email button.

### Telemetry
- Event tracking for widget opens, copy clicks, "I have paid", confirmations.

**Deliverables:** Production-ready widget, merchant integration docs, sample code.

---

## Phase 3 — SideShift Integration & Cross-Chain Routing

### Swap/bridge orchestration
- Route preview endpoint: POST /route/preview (simulate swap, fee, net).
- Integrate SideShift to create deposit addresses and execute swaps.

### Fee & gas logic
- Auto-deduct platform fee and gas from incoming funds.
- If insufficient for bridging/gas -> route to unresolved pool and flag.

### Transaction pipeline
- On incoming tx: detect → preview route → execute swap → send net to merchant or add to batch.
- Log full route + tx hashes.

### Edge case handling
- Wrong chain/irretrievable tokens → unresolved flow and admin notification.

**Deliverables:** Reliable swap routing, gas/fee deduction, unresolved handling.

---

## Phase 4 — Merchant Dashboard (v1) + Batch Settlement

### Merchant dashboard
- View transactions, filtering, export CSV/JSON, add multi-chain wallets, toggles (accept-any-chain, auto-gas coverage, preferred token).

### Batch engine
- Collect net funds → bundle swaps/payouts → execute batch payout to merchant wallet.
- Batch queue management and manual execute option in admin.

### Notifications
- Email templates for merchant & user: payment success, unresolved, batch payout.

### Exports
- CSV export and simple charts (daily totals, token breakdown).

**Deliverables:** Merchant UI, batch settlement engine, email notifications.

---

## Phase 5 — UX polish, Monitoring, & Hardening

### UX polish
- Microcopy review, transaction details page with full metadata (device, time-to-confirm, tx hash, merchant contact).
- Add merchant contact CTA in widget (mailto/URL).

### Security hardening
- Webhook HMAC verification, rate limits, IP allowlist, secrets rotation.
- Penetration checklist, automated backups, audit logs.

### Observability
- Add Prometheus/monitoring, error tracking (Sentry), on-chain monitors for stuck swaps.

### Legal & compliance
- TOS, privacy, basic KYC plan for high-volume merchants (deferred for MVP but template ready).

**Deliverables:** Production-grade UX, security, monitoring, legal templates.

---

## Phase 6 — Launch & Post-Launch Iteration

### Soft launch
- Invite 10–20 pilot merchants, collect feedback, fix UX friction.

### Metrics to track
- Time-to-confirm, failed swap %, unresolved rate, average fee revenue, widget conversion rate.

### Iterate
- Priority backlog from pilot feedback: reduce unresolved cases, speed up batch payouts, UI improvements.

### Scale
- Optimize batch logic for gas savings, add more chains, enhance SideShift fallbacks.

**Deliverables:** Pilot feedback loop, performance optimizations, expanded chain support.

---

## Must-have Technical Choices (MVP)

- **Backend:** Node.js/TypeScript (NestJS or Express) or Go (if you prefer).
- **DB:** Postgres for transactional integrity.
- **Worker queue:** BullMQ/Redis or RabbitMQ for batch/worker tasks.
- **Monitoring:** Prometheus + Grafana, Sentry.
- **Hosting:** Cloud provider (AWS/GCP) — use managed DB and Redis.
- **Secrets:** Vault or cloud KMS for SK and admin wallet keys.
- **Front-end widget:** Vanilla JS or React small bundle, delivered via CDN.
- **Auth:** JWT for merchants, HMAC for webhooks.
- **Third-party:** SideShift for swaps/bridging, optional Infura/Alchemy for EVM node access, Solana RPC provider.

---

## MVP Acceptance Criteria (what "done" looks like)

- Merchant can create deposit session via secret key and get widget URL.
- Widget shows correct unique deposit address, chain, and amount.
- Platform auto-detects confirmed on-chain payments and shows full transaction details in widget and dashboard.
- SideShift swaps/bridges executed and platform fee + gas deducted, net sent to merchant (or queued in batch).
- Admin unresolved pool works for problematic tx and shows merchant details.
- Merchant can export transactions and receive batch payouts.
- Email notifications sent for payment success and unresolved events.
- No seed phrases stored; webhooks secured; basic rate-limits in place.

---

## High-impact UX decisions (do these well)

- Make the widget tiny and mobile-first; clear, bold chain name and amount.
- One-click copy + QR + auto‐focus on copy interaction.
- Prominent warnings for wrong chain/amount with merchant contact CTA.
- Transaction detail must show explorer link, time-to-confirm, device info.
- Fast visual feedback for "I Have Paid" + spinner while monitoring confirmations.
