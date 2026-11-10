# Phase 17 — UAT plan (prep only — sign-off PENDING)

Date prepared: 2026-07-31. **This is a script for a structured UAT round with real talent and
real clients on staging — it has not been run.** An agent cannot recruit real users or grant
the human sign-off this gate requires (confirmed with the user before starting this phase); this
document is the deliverable that makes that round possible to execute later, not a substitute for
running it.

## Prerequisites before this can actually run

- A staging environment with test-mode real providers (Paystack test keys, Smile Identity
  sandbox, Google Calendar test OAuth app) — **does not exist yet** per this phase's own
  environment check (see `README.md`'s PENDING list). All-mock or a real-dev-DB integration test
  is not a substitute for a UAT round: real users need to experience real (test-mode) payment and
  identity flows, not a stubbed provider.
- A small panel of real talent and real clients recruited and briefed.
- A severity-triage rubric agreed in advance (suggested below) so findings can be actioned
  consistently.

## Journey 1 — Talent: build storefront → get discovered → book → escrow → deliver → release

| Step | Action | Pass criteria |
|---|---|---|
| 1 | Register as talent, complete onboarding (niche, location, bio) | Account created, lands on talent dashboard |
| 2 | Upload media (photo/video reel) | AI style-tagging job progresses queued→tagging→done, no fabricated "verified" claim shown |
| 3 | Set rate card(s) and availability (specific days + recurring template) | Availability UI reflects the default-free rule — an untouched day is bookable |
| 4 | View own public storefront at `/[handle]` while logged out (separate browser/incognito) | Full public profile, prices, no private data visible |
| 5 | Share the public link; have a client-panelist book a service through it (Journey 3) | — |
| 6 | Mark deliverables provided once a booking is `ESCROW_LOCKED` | Client is notified; approval unlocks |
| 7 | Confirm payout after client approves | Correct net amount (base − talent fee) |

## Journey 2 — Client: post brief → applications → select

| Step | Action | Pass criteria |
|---|---|---|
| 1 | Register as client, complete onboarding | Account created, lands on client dashboard |
| 2 | Post a brief with an applicant cap | Brief visible to matching talent |
| 3 | Have 2+ talent-panelists apply | Applications appear in the client's applicant list |
| 4 | Reach the cap with one more real (or seeded) applicant | Applications close automatically; a late applicant sees a clear closed state, not a broken form |
| 5 | Shortlist, then select an applicant | Selected applicant notified; others see a clear rejected/not-selected state |

## Journey 3 — External link → book → auto-account (Phase 16 flagship flow)

| Step | Action | Pass criteria |
|---|---|---|
| 1 | Open a talent's public link **while logged out**, on a real phone | Full storefront, no login prompt |
| 2 | Tap "Book", pick a service + real open slot | Slot picker reflects real availability, not a stale/fake calendar |
| 3 | Read the escrow explainer at the summary step | Plain-language, reassuring — not fine print |
| 4 | Add an optional context note | Clearly labeled "not a conversation" |
| 5 | Enter name + email | No account-creation friction — feels like checkout, not signup |
| 6 | Pay (test-mode card) | Progress indicator shown ("Step 2 of 3"); no double-charge on a slow network / accidental double-tap |
| 7 | Land on the confirmation screen | Clear message that an account was created and where to check email |
| 8 | Open the emailed set-password link | Sets password, lands directly in the client dashboard with the booking visible and chat live |
| 9 | Attempt to open the order room **before** completing step 6 (e.g. abandon at step 5 and try the booking id directly) | Chat is unreachable — this is the escrow-first invariant; a UAT panelist trying to "peek early" should hit a clear, non-broken blocked state |

## Suggested severity triage

- **Blocker**: money is lost, wrong, or unaccounted for; data leaks across accounts; a flow
  cannot be completed at all.
- **High**: a flow completes but with confusing, misleading, or inconsistent behavior a real
  user would reasonably file a support ticket over.
- **Medium/Low**: cosmetic, copy, or minor friction issues.

Blockers and Highs must be resolved (or explicitly, knowingly accepted by a human) before
cutover, per the phase's own gate language.

## Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| UAT facilitator | _pending_ | | |
| Talent panelist(s) | _pending_ | | |
| Client panelist(s) | _pending_ | | |
| Human sign-off (go/no-go) | **PENDING** | | **Not run — cannot be signed off by this pass.** |
