# PaperVeil demo script — target 2:40

## 0:00–0:15 — Open on the problem

“Marketplace insurers denied nineteen percent of in-network claims in 2024. Fewer than one percent were appealed. PaperVeil helps with the paperwork without putting raw identity into the agent’s tool results.”

Show the populated $4,200 case and the ledger at zero raw identifiers released.

## 0:15–0:48 — Find a specific defect

Send the saved demo prompt. Let the agent call `list_evidence`, `find_line_items`, and `check_rules`.

“The agent found a missing itemized bill, an unsigned referral, and a suspected eight-hundred-and-fifty-dollar duplicate technical charge. Those findings appear in the same workspace I see.”

## 0:48–1:12 — Compare paths

Let the agent call `simulate_outcomes` with “appeal now” and “complete evidence packet.”

“This is not predicting whether I win. It compares which procedural gaps are resolved before filing.”

## 1:12–1:42 — Deny disclosure

Let the agent call `request_disclosure` for date of birth. Click **Deny · use token**.

“The tool was suspended while I decided. I denied it, the tool returned `[[DOB]]`, and the workflow continued.”

Keep the ledger counter at zero raw identifiers released in frame.

## 1:42–2:13 — Receipt-only drafting

Let the agent call `draft_appeal`. Open Packet.

“The agent supplied the argument structure, but the tool returned only this receipt. The full letter remained in the page. Identity substitution happens locally.”

Briefly toggle **Reveal locally**, then turn it off.

## 2:13–2:34 — Prove the boundary

Expand the latest ledger entries.

“Every registration and invocation records its exact returned bytes, gate decision, raw fields, quasi-identifiers, and tool-description hash. The limitation is explicit: this is disclosure minimization, not anonymity.”

## 2:34–2:40 — Close

“PaperVeil gives the agent capabilities, not your identity.”
