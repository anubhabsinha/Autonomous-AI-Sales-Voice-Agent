# Relay · Autonomous AI Sales Voice Agent

A working browser-based MVP for demonstrating a sales conversation from first contact through qualification, grounded product answers, meeting booking, CRM handoff, and call recap.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Validate the project with:

```bash
npm run lint
npm run build
```

## End-to-end demo

1. Open the preloaded Olivia Chen conversation in **Live conversation**.
2. Select a language. Use **Start live call** to enable browser speech recognition where supported and speech synthesis for the agent response. Microphone access requires a secure context; `localhost` is supported by modern browsers.
3. If speech recognition is unavailable or microphone access is not granted, type a lead message in the transcript composer, for example: “What does Growth cost?” The agent replies using the local knowledge set and speaks the reply when browser speech synthesis is available.
4. Select knowledge results to inspect their retrieved excerpts. The chosen source is highlighted and the scripted response uses the matching local product, pricing, or security content.
5. Book one of the proposed follow-up slots, then click **Sync lead to HubSpot**. Both actions update the visible demo state; they do not contact an external calendar or CRM.
6. End the call or choose **View call summary**. Download the transcript and call recap as a text file, or use **Save to CRM** to demonstrate the handoff state.

## MVP scope and boundaries

- **Voice:** browser Web Speech APIs provide speech-to-text and text-to-speech when supported. A typed transcript composer is the fallback. This is a browser prototype, not a telephony-connected agent.
- **Multilingual:** language selection sets the browser speech locale for English, Spanish, French, and German. The local answer templates are English; genuine multilingual generation requires a multilingual model/API.
- **Qualification and sentiment:** team size, needs, timing, budget, decision-maker signals, fit score, and sentiment are derived from transcript text using local keyword heuristics. This is transparent demo logic, not model-generated analysis or a validated scoring model.
- **Knowledge retrieval:** the demo uses a small in-memory set of sample product documents and keyword routing. It demonstrates source grounding but is not a production vector database or semantic RAG implementation.
- **Booking and CRM:** appointment slots and HubSpot sync are local UI state only. No credentials, external data transfer, or real bookings are used.
- **Summary and insights:** the recap is generated from the sample scenario and current transcript. Downloading it works locally; dashboard metrics are illustrative.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the system architecture diagram and production deployment boundaries.

## Business problem

Inbound sales teams lose qualified opportunities when calls go unanswered, discovery notes are inconsistent, and follow-ups are delayed. The prototype demonstrates one assistant experience that captures the conversation, organizes buying signals, answers from approved product material, and creates a clear next action.

## Commercial feasibility

An initial deployment can be sold as a per-seat or per-minute sales-assist product, with higher tiers for telephony, CRM automation, analytics, and governance. The core MVP has a low-cost path using managed speech and LLM APIs plus existing CRM/calendar integrations. Before production, validate willingness to pay against measured conversion lift and agent time saved; budget for speech/model usage, telephony, data retention and security controls, integration maintenance, and human escalation. The most useful pilot metric is qualified meetings booked per inbound lead, compared with the team's baseline.

## Production path

1. Add a backend session service and connect a streaming speech/LLM provider; keep model and CRM secrets server-side.
2. Replace keyword routing with embeddings and a vector store. Return source IDs/snippets with each answer and enforce approved-document retrieval.
3. Use a telephony provider for inbound/outbound calls and explicit consent, recording, and retention controls.
4. Connect calendar availability and CRM APIs through authenticated server-side adapters with idempotent writes and audit events.
5. Persist call state with tenant isolation, access controls, retention limits, observability, and human handoff rules.
6. Evaluate transcripts and outcomes for speech accuracy, retrieval grounding, qualification quality, latency, and conversion lift before expanding rollout.