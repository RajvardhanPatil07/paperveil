# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, TypeScript, Tailwind CSS, IndexedDB via `idb`, Vitest, Playwright, and Vercel.

## Users

People facing a medical-claim denial who want agent assistance without uploading raw identity documents or identifiers to a model. The first release also serves hackathon judges evaluating the shared human-agent workflow.

## Product Purpose

PaperVeil identifies fixable procedural defects in a fictional medical claim, compares evidence scenarios, and prepares a locally personalized appeal packet. Success means the agent completes the workflow after a user denies an identity disclosure request, while the interface proves exactly what data crossed the tool boundary.

## Positioning

The agent receives browser-local capabilities rather than the user's documents. A visible disclosure ledger makes the WebMCP tool boundary an inspectable privacy boundary.

## Operating Context

The product runs as a top-level page in ChatGPT's in-app browser or a WebMCP-enabled Chrome session. It ships with one deterministic, synthetic $4,200 claim and a fictional policy pack for a reliable demonstration.

## Capabilities and Constraints

- Seven imperative WebMCP tools share the same domain logic as the human interface.
- Raw identifiers and their token map remain in IndexedDB unless the user approves one explicit disclosure.
- Tool results are sealed with per-tool allowlists and scanned for known identifiers.
- No backend, authentication, OCR, real document upload, external AI API, second rule pack, or multiple cases.
- A disclosure request auto-denies after 20 seconds.
- The product demonstrates disclosure minimization, not anonymity, HIPAA compliance, legal advice, or guaranteed appeal outcomes.

## Brand Commitments

The product name is PaperVeil. The primary line is “The agent gets capabilities, not your identity.” The voice is precise, calm, candid about limitations, and centered on proof rather than promises.

## Evidence on Hand

- User-provided product plan and acceptance criteria.
- Official WebMCP challenge requirements and judging criteria.
- KFF 2024 Marketplace claims-denial analysis and CMS appeal-rights guidance for submission copy.
- No testimonials, customers, real patient records, or clinical claims; future work must not fabricate them.

## Product Principles

- Prove the boundary in the interface.
- Keep the human in control of every identity disclosure.
- Prefer one reliable end-to-end story over feature breadth.
- Make agent and human actions converge on the same visible state.
- Fail closed when privacy invariants cannot be verified.

## Accessibility & Inclusion

Keyboard-operable controls, visible focus, reduced-motion support, sufficient contrast, descriptive status text, and layouts that remain usable on narrow screens.
