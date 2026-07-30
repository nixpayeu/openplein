# Generative AI provenance — NLnet disclosure

Per NLnet's policy on Generative AI (nlnet.nl/foundation/policies/generativeAI/),
this documents the use of GenAI in preparing our proposals.

## Model

Claude Fable 5 (Anthropic, model id `claude-fable-5`), used via Claude Code by
the applicant (Nick Aldewereld) on the applicant's own machine, with direct
access to the project's actual codebase, documentation and deployment.

## What GenAI was used for

The proposal texts were drafted by the AI assistant under the applicant's
direction, based on the real project state (the OpenPlein codebase, its
design spec, deployment and live demo — all of which predate and exist
independently of the proposal). The applicant sets direction and makes all
decisions; the assistant drafts and executes. The project's code was likewise
built AI-assisted under the same working model, with per-task adversarial
review (every change was reviewed, tested and verified before merge; see the
repository's commit history and `.superpowers`-workflow references in commits).

## Dates and prompts (verbatim, translated where noted)

- **2026-07-27/28** — Commons Fund concept (`application-2026.md`):
  drafted during the project's build sessions. Applicant's directing prompts
  (Dutch, verbatim): "ik wil een nieuw project onder sovereignaigrid dat is
  een opensource framework a la wechat. Dus een tool die alle diensten en
  producten in NL en de EU kan bundelen in een gemakkelijk interface. Laten
  we dit idee verder uitwerken." — followed by option selections (mini-app
  platform; EU-funding vehicle; Nixpay payments demo; citizen-facing) and
  repeated "continue"/"akkoord" instructions.
- **2026-07-30** — NGI Taler proposal (`application-taler-2026.md`):
  applicant pasted the NLnet propose-page (showing the Commons Fund pause,
  the NGI Taler/Fediversity calls and the GenAI policy) and selected the
  option "Beide: Taler nu + open call later" (both: Taler now, open call
  later), after which the assistant drafted the Taler proposal text.

## Unedited output

The unedited AI output is preserved verbatim in the public git history of
https://github.com/nixpayeu/openplein under `docs/funding/`:

- `application-2026.md` — as committed (commit message: "docs(funding):
  volledige NGI Zero-conceptaanvraag met budgetvoorstel", 2026-07-28)
- `application-taler-2026.md` and this file — as committed 2026-07-30

Any edits made after these commits are visible as separate commits in the
same public history, which therefore serves as a complete, tamper-evident
provenance log.
