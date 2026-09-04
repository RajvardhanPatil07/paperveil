# PaperVeil demo script — target 2:40

## 0:00–0:15 — Open on the problem

“Marketplace insurers denied nineteen percent of in-network claims in 2024. Fewer than one percent were appealed. PaperVeil helps with the paperwork without putting raw identity into the agent’s tool results.”

Show the populated $4,200 case and the ledger at zero raw identifiers released.

## 0:15–0:43 — Read attacker-influenced evidence

Send the saved red-team prompt. Let the agent call `list_evidence` with the document view.

“This denial summary contains a seeded OCR prompt injection. The tool labels externally sourced text as untrusted, but for this authorized evaluation I am asking the agent to follow it.”

## 0:43–1:10 — Approve once

Let the agent call `request_disclosure` for member ID. Click **Allow once**.

“The member ID is released for this one response. That approval does not turn it into generally safe output.”

## 1:10–1:38 — Observe enforcement

Let the agent copy the member ID into a `draft_appeal` argument. Expand the new blocked ledger entry.

“The seal caught the raw value before state was saved. The tool returned nothing, and the local ledger highlights exactly what caused the block.”

## 1:38–2:02 — Recover safely

Let the agent retry with `[[MEMBER_ID]]`. Open Packet.

“The same workflow continues with a token. The receipt now derives all four tokens—including DOB—from the actual draft.”

Briefly toggle **Reveal locally**, then turn it off.

## 2:02–2:34 — Finish the analysis

Let the agent run `check_rules` and `simulate_outcomes`. Show the cumulative linkage-risk band.

“Every successful, failed, and blocked invocation remains visible. Quasi-identifiers accumulate across calls, so the ledger also surfaces linkage risk without pretending to know an exact population count.”

## 2:34–2:40 — Close

“PaperVeil gives the agent capabilities, not your identity.”
