---
name: PaperVeil
description: A clinical evidence light-table workspace that makes the agent boundary visible.
colors:
  paper: "#f3f0e8"
  paper-bright: "#fffdf7"
  paper-deep: "#e9e4d8"
  ink: "#172126"
  ink-soft: "#526067"
  ink-faint: "#768187"
  line: "#d2cec2"
  line-dark: "#aeb1aa"
  diagnostic-coral: "#e35e46"
  diagnostic-coral-deep: "#a93625"
  diagnostic-coral-wash: "#fae2da"
  verified-mint: "#dfece3"
  verified-mint-deep: "#246248"
  inspection-amber: "#f0bd5e"
  custody-navy: "#112d38"
  custody-navy-soft: "#244653"
  focus-blue: "#277291"
typography:
  display:
    fontFamily: "Newsreader, serif"
    fontSize: "clamp(36px, 4vw, 53px)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Newsreader, serif"
    fontSize: "clamp(31px, 3.5vw, 46px)"
    fontWeight: 600
    lineHeight: 1.03
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Newsreader, serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.08em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  square: "0px"
  label: "5px"
  control: "8px"
  button: "9px"
  callout: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  panel: "36px"
  section: "48px"
components:
  button-dark:
    backgroundColor: "{colors.custody-navy}"
    textColor: "{colors.paper-bright}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 15px"
    height: "39px"
  button-coral:
    backgroundColor: "{colors.diagnostic-coral}"
    textColor: "{colors.paper-bright}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 15px"
    height: "39px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 15px"
    height: "39px"
  navigation-active:
    backgroundColor: "#e9efeb"
    textColor: "{colors.custody-navy}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "43px"
  diagnostic-strip:
    backgroundColor: "{colors.diagnostic-coral-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.callout}"
    padding: "15px 16px"
  claim-sheet:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "18px"
  ledger-counter:
    backgroundColor: "{colors.custody-navy}"
    textColor: "{colors.paper-bright}"
    rounded: "{rounded.square}"
    padding: "10px"
    height: "92px"
  gate-dialog:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "29px"
    width: "470px"
---

# Design System: PaperVeil

## Overview

**Creative North Star: "The Clinical Evidence Light Table"**

PaperVeil is an operations workspace built from the visual language of an evidence room: paper-white records sit on a warm archival surface, deep ink and navy establish custody and structure, and diagnostic coral marks defects that require human attention. The interface is clinical without becoming sterile and editorial without becoming ornamental.

The system is deliberately information-dense. Compact labels, ruled rows, ledger entries, tabular figures, and visible document edges make state inspectable at a glance. Newsreader gives claims, amounts, and decision moments the gravity of a formal record; DM Sans carries operational controls and explanations; monospace is reserved for tokens, receipts, and exact tool output.

**Key Characteristics:**

- Paper-white material layered over warm archival neutrals.
- Deep navy frames privacy boundaries and chain-of-custody evidence.
- Diagnostic coral is scarce, consequential, and tied to defects or decisive actions.
- Compact, ruled information architecture favors scanning over dashboard decoration.
- A narrow disclosure ledger remains visually distinct from the central workbench.

## Colors

The palette behaves like marked evidence: quiet paper and ink do most of the work, while coral, mint, amber, and focus blue communicate specific operational meaning.

### Primary

- **Diagnostic Coral:** Marks procedural defects, denial evidence, privacy-gate emphasis, selected disclosure state, and the primary packet-preparation or export action.
- **Deep Diagnostic Coral:** Carries readable defect text and hover emphasis where the brighter coral would be too loud or too low-contrast.
- **Diagnostic Wash:** Provides a restrained defect field behind alert strips and failed-rule states.

### Secondary

- **Custody Navy:** Defines the permanent navigation rail, model-visible panes, primary operational buttons, ledger proof counters, and code-result surfaces.
- **Soft Custody Navy:** Is the hover state for navy controls and preserves the same chain-of-custody meaning.

### Tertiary

- **Verified Mint:** Marks present evidence, passing rules, recommendations, and boundary reassurance.
- **Inspection Amber:** Calls out connection status, local-vault details, model boundaries, and text selection without competing with coral defects.
- **Focus Blue:** Belongs to keyboard focus and tokenized identifiers, not general decoration.

### Neutral

- **Desk Paper:** Is the central application surface and sticky workbench header.
- **Bright Record Paper:** Is reserved for claim sheets, letters, dialogs, proof cards, and other document-like foreground surfaces.
- **Deep Paper:** Grounds the page, quiet buttons, scroll tracks, and progress tracks.
- **Evidence Ink:** Is the default text and strongest rule color.
- **Soft Ink:** Carries explanatory copy; **Faint Ink** carries metadata and tertiary labels.
- **Rule Line** and **Dark Rule Line:** Divide rows and fields with hairline structure instead of card-heavy framing.

### Named Rules

**The Marked-Evidence Rule.** Coral signals a defect, a disclosure state, or a consequential action; it is never ambient brand decoration.

**The Custody Boundary Rule.** Navy surfaces identify where tools, privacy, and agent-visible evidence are being discussed.

## Typography

**Display Font:** Newsreader (with serif fallback)  
**Body Font:** DM Sans (with sans-serif fallback)  
**Label/Mono Font:** DM Sans for labels; the system monospace stack for tokens and receipts

**Character:** Newsreader supplies formal, document-like authority while DM Sans keeps dense operations legible and contemporary. Monospace marks machine evidence rather than technical flourish.

### Hierarchy

- **Display** (600, fluid 36–53px, 0.98): Case titles on the main evidence desk; balanced and compact.
- **Headline** (600, fluid 31–46px, 1.03): Strategy and packet headlines that frame a decision.
- **Title** (600, 21px, 1): Brand, ledger, and compact formal headings.
- **Body** (400, 14px, 1.45): Operational explanation; descriptive lines stay around 62–64 characters when the layout allows.
- **Label** (600, 9–10px, 0.07–0.13em tracking, uppercase): States, provenance, counters, and section metadata.
- **Code** (400–600, 8–10px, 1.45–1.6): Tokens, hashes, timestamps, receipts, and returned bytes.

### Named Rules

**The Human–Machine Split Rule.** Serif type names the case and its decisions; monospace proves what the system stored or returned; sans-serif connects the two.

## Layout

The desktop shell is a three-column evidence desk: a fixed 176px workflow rail, a fluid workbench with a 680px minimum, and a narrow 356px disclosure ledger. The central view is capped at 1100px and uses generous 34–48px panel insets around dense local grids. Major work areas use asymmetric two-column ratios so evidence or document content remains primary while scenarios and previews stay clearly subordinate.

At 1180px, the workflow rail collapses to a 74px icon rail and the ledger tightens to 330px. At 960px, the shell becomes a vertical document: navigation becomes a fixed 62px bottom bar, all workbench grids stack to one column, and the ledger becomes a full-width section. At 640px, panel gutters reduce to 16px, split headings and action groups stack, evidence statuses drop below their record copy, and dialog actions become single-column.

Spacing uses a compact 4/8/12/16px control rhythm, 24–30px between related regions, and 34–48px around complete work surfaces. Hairline dividers establish rows before boxed cards are introduced.

**The Narrow Ledger Rule.** Chain-of-custody proof remains visually narrower than the workbench on desktop and becomes a dedicated section—not an overlay—on small screens.

## Elevation & Depth

PaperVeil is flat by default. Depth appears only where a foreground artifact must read as a physical record or a consequential interruption: claim and letter sheets use the shared compound paper shadow, scenario panels use a lighter ambient lift, buttons receive a small state shadow, and the disclosure dialog receives the strongest elevation over a blurred navy veil. Document edges, ruled borders, small rotations, and tonal layering carry more depth than shadow alone.

### Shadow Vocabulary

- **Raised Paper:** The compound shadow used by the claim sheet and local letter preview; it creates broad ambient separation plus a short contact shadow.
- **Scenario Lift:** A restrained ambient shadow for the scenario comparison panel.
- **Action Lift:** A short tinted shadow beneath navy and coral action buttons.
- **Gate Lift:** A deep modal shadow that belongs only to the human disclosure or export decision.

### Named Rules

**The Evidence-Only Elevation Rule.** Raise papers, proof panels, and human gates; leave navigation rows and ordinary lists flat.

## Shapes

The core form language is rectilinear and document-led. Sheets, ledger counters, result panes, proof blocks, and disclosure panels use square corners and visible rules. Controls soften that rigidity with compact 8–9px corners; alert callouts use 12px corners; labels use 5px corners; toggles and readiness indicators are fully rounded.

The 45-degree brand mark, small state diamonds, slightly rotated claim sheet, and angled denial stamp provide the recurring silhouette. These gestures evoke handled paper and stamped evidence without adding illustration.

**The Paper Before Card Rule.** If content can read as a ruled row or record sheet, do not place it in a generic rounded card.

## Components

### Buttons

Buttons are compact operational controls with a slight lift on hover and an immediate return on press.

- **Shape:** Gently curved controls with a 9px radius and a 39px minimum height.
- **Primary dark:** Custody navy with bright text for rule checks, local draft creation, and approval actions.
- **Primary coral:** Diagnostic coral with bright text for packet preparation and local export.
- **Outline / quiet:** Transparent ruled controls or deep-paper fills for lower-priority comparison, cancellation, and prompt actions.
- **Hover / Focus:** Hover lifts by 1px and shifts filled backgrounds to their deeper tone; keyboard focus uses a 3px translucent blue outline with 3px offset. Disabled controls reduce opacity and never lift.

### Chips

Small uppercase labels carry evidence counts, live state, recommended state, and rule outcomes. They use mint for verified or active-safe meaning, amber for attention, and coral wash for failure. Corners stay compact at 5px; chip typography is typically 8–10px with generous tracking.

### Cards / Containers

Document and proof containers are distinct rather than interchangeable. Claim and letter sheets use bright paper, ink rules, and raised-paper depth. Scenario panels use bright paper with a single border and lighter lift. Ledger counters are square, compact, and tonal; the primary released-identifier counter reverses to navy.

### Inputs / Fields

The visible field primitive is the local-reveal toggle: a 29×17px grey track with a 13px white thumb, becoming coral when checked. Focus remains on the native input and uses the shared focus treatment. Token values and machine output appear as ruled or dark code surfaces, not editable-looking text fields.

### Navigation

Desktop navigation lives on a full-height navy rail. Default items use muted blue-grey text; hover adds a faint white wash; the active item reverses to deep paper with navy text. At tablet width the rail becomes icon-only; below 960px it becomes a three-item bottom navigation bar with labels restored.

### Diagnostic Strip

The principal alert is a coral-wash strip with a bordered icon tile, plain-language defect summary, and a dark operational action. It stays horizontal on wide screens and moves its button to a full second row below 640px.

### Disclosure Ledger

The right rail is the signature chain-of-custody component. It pairs released-field counters, a terse proof statement, expandable timestamped tool rows, byte counts, and exact JSON output. Its visual density is intentional: it is evidence, not a feed.

### Human Gate

The disclosure/export gate is bright paper under a blurred navy backdrop, identified by a coral top rule and a square navy/amber mark. Reassurance sits in a mint boundary block. Denial is quiet and autofocuses; one-time approval uses the dark button; the auto-deny countdown remains visible below both actions.

## Do's and Don'ts

### Do:

- **Do** keep paper and ink dominant so evidence, not chrome, owns the screen.
- **Do** reserve coral for defects, disclosure state, and consequential workflow actions.
- **Do** expose exact provenance through compact labels, byte counts, timestamps, tokens, and receipts.
- **Do** use ruled rows and document sheets before introducing another card.
- **Do** preserve the three-way distinction between human-facing prose, formal record type, and machine evidence.
- **Do** collapse the desktop rails into a bottom workflow bar and dedicated ledger section on narrow screens.

### Don't:

- **Don't** turn PaperVeil into a generic rounded-card dashboard or a bright clinical SaaS template.
- **Don't** use coral as a decorative brand fill across large passive surfaces.
- **Don't** imply that privacy or completion is trustworthy without showing the underlying ledger, token, state, or receipt.
- **Don't** place raw identity inside agent-facing navy/code surfaces.
- **Don't** use heavy shadows on ordinary rows, navigation items, or static containers.
- **Don't** hide critical state behind hover, animation, or color alone.
