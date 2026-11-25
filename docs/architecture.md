# System Architecture

## MVP request and data flow

```mermaid
flowchart LR
    Lead[Prospect / browser microphone] -->|SpeechRecognition| UI[React sales-agent console]
    UI -->|Transcript and typed fallback| State[In-memory call session state]
    State --> Router[Keyword intent routing]
    Router --> KB[(Local sample knowledge set)]
    KB -->|Relevant excerpt| Router
    Router -->|Scripted grounded reply| State
    State -->|SpeechSynthesis| Lead
    State --> Qual[Keyword-based qualification and sentiment]
    State --> Booking[Local appointment-slot state]
    State --> CRM[Demo CRM sync state]
    State --> Summary[Local call recap and text export]
```

The prototype runs entirely in the browser. The microphone and speaker are browser APIs; transcript, local knowledge, booking confirmation, CRM handoff, and sample insights are client-side demonstration logic. No call audio or lead data is sent to an external service.

## Production target architecture

```mermaid
flowchart LR
    Prospect[Prospect phone / web client] --> Telephony[Telephony and streaming media]
    Telephony --> Session[Authenticated session service]
    Session --> STT[Streaming speech recognition]
    STT --> Orchestrator[Conversation orchestration and policy]
    Orchestrator --> LLM[LLM response and structured extraction]
    Orchestrator --> Retrieval[Retrieval service]
    Retrieval --> Vector[(Tenant-scoped vector index)]
    Vector --> Docs[(Approved product and policy documents)]
    Retrieval --> Orchestrator
    LLM --> Orchestrator
    Orchestrator --> TTS[Streaming speech synthesis]
    TTS --> Telephony
    Orchestrator --> Qualification[Lead qualification and sentiment]
    Qualification --> Session
    Session --> Calendar[Calendar adapter]
    Session --> CRM[CRM adapter]
    Session --> Store[(Encrypted call and event store)]
    Store --> Insights[Analytics and business insights]
    Admin[Workspace admin] --> Console[Web console]
    Console --> Session
    Console --> Insights
```

## Trust boundaries and production requirements

- Keep provider credentials in server-side secret storage; never ship API keys in the browser bundle.
- Authenticate and authorize tenant access before session, transcript, knowledge, CRM, or calendar operations.
- Scope retrieval and persistence by tenant and document permissions; log source IDs for every generated answer.
- Obtain recording/transcription consent, apply configured retention/deletion policies, and redact sensitive fields where required.
- Use idempotent CRM/calendar writes, retries with limits, audit events, and a human handoff path.
- Track latency, speech recognition errors, retrieval grounding, model refusals, booking outcomes, and qualified-meeting conversion.
