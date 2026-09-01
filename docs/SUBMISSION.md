# Devpost submission draft

**Live project:** [paperveil-two.vercel.app](https://paperveil-two.vercel.app)

## One-line pitch

PaperVeil lets an agent prepare a medical-claim appeal using browser-local capabilities while the user negotiates every identity disclosure.

## Project description

People often need help understanding a denied claim, but the source material contains some of their most sensitive information. PaperVeil inverts the usual “upload your documents to the model” workflow. The fictional case stays in IndexedDB, while WebMCP exposes seven narrow actions for inspecting evidence, checking procedural rules, comparing scenarios, and saving appeal grounds.

The signature interaction is `request_disclosure`. When the agent asks for a date of birth, the page suspends the tool and asks the human. Clicking Deny returns a placeholder token instead of failing the workflow. The agent continues, `draft_appeal` returns a receipt rather than prose, and the page renders and exports the personalized packet locally.

Every registration and invocation is captured in a disclosure ledger. Judges can inspect the exact bytes returned, raw identifiers released, quasi-identifiers exposed, gate decisions, and tool-description hashes.

## Why it scores

### WebMCP leverage

The privacy behavior depends on the tool executing in the live page with access to local state. Promise-suspended human gates, precise schemas, bounded outputs, and the shared human-agent state are integral rather than ornamental.

### Execution

The submission is a complete three-part product: populated case desk, deterministic strategy workspace, local packet preview, export, failure states, responsive layout, tests, and a judge-ready seeded flow.

### Potential impact

KFF found that 19% of in-network Marketplace claims were denied in 2024, fewer than 1% of denied claims were appealed, and insurers upheld 66% of filed appeals. PaperVeil focuses on the credible, narrow job of finding fixable procedural defects and preparing a reviewable packet.

### Creativity and ambition

Most agent products ask for more data. PaperVeil gives the agent less data but better capabilities, then turns every disclosure into an explicit, auditable negotiation.

## Built with

Next.js, TypeScript, WebMCP imperative API, IndexedDB, Vitest, Playwright, and Vercel.
