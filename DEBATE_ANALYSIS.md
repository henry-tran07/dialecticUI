# Debate / Seminar Analysis (Post-Meeting)

After a Zoom meeting, the full transcript (from STT) can be analyzed to give students **thorough, rubric-based feedback** on their debate and seminar performance. The analysis is produced by an LLM (Perplexity, OpenAI, or any OpenAI-compatible API) using a fixed rubric so feedback is consistent and actionable.

---

## Transcript format

- Each segment is **speaker indicated, then text** from that speaker's speech (as from STT).
- **AI agents are not live participants** in the meeting; their turns are **integrated into the transcript retroactively** (e.g. after the meeting). When building the transcript, assign those segments `speakerRole: 'agent'` and the appropriate `speakerId` (e.g. persona name).

---

## Overview

1. **Input:** A `MeetingTranscript` (see `@dialectic/shared`) — ordered segments with speaker, text, and optional timestamps. Multiple students can appear; each is analyzed separately.
2. **Rubric:** Seven criteria (chain of reasoning, sound evidence, clarity, logical consistency, engagement/civility, relevance/focus, critical thinking). Each is scored 1–5 with cited examples from the transcript.
3. **Output:** `StudentDebateFeedback` (one per student) — overall score and summary, per-criterion scores and feedback, strengths, areas for improvement, and suggested next steps.

---

## Rubric (evaluate student debate / response metrics)

| Criterion | What we evaluate |
|-----------|-------------------|
| **Chain of reasoning** | Step-by-step argument; explicit connections; no unexplained leaps. |
| **Sound evidence** | Relevant, accurate evidence; clear support for claims; fact vs. interpretation. |
| **Clarity of response** | Precise language; direct answers; structure where helpful. |
| **Logical consistency** | No contradictions; coherent position; tensions acknowledged. |
| **Engagement and civility** | Engages others' points; respectful dialogue; constructive disagreement. |
| **Relevance and focus** | Stays on topic; addresses the question; minimal tangential drift. |
| **Critical thinking** | Questions assumptions; considers counterarguments; revises when warranted. |

Scale: **1** = needs improvement → **5** = excellent. The LLM is prompted to cite specific quotes from the transcript for both strengths and areas for improvement.

---

## Usage

### Single student (or one student to evaluate)

```ts
import { analyzeTranscript } from '@dialectic/debate-analysis';
import type { MeetingTranscript } from '@dialectic/shared';

const transcript: MeetingTranscript = {
  sessionId: 'sess_123',
  segments: [
    { id: '1', speakerId: 'Alex', speakerRole: 'student', text: '...' },
    { id: '2', speakerId: 'Socrates (AI)', speakerRole: 'agent', text: '...' },
    // ...
  ],
};

const feedback = await analyzeTranscript(transcript, {
  sessionId: 'sess_123',
  studentId: 'alex_456',
  studentSpeakerId: 'Alex',  // when multiple students, evaluate only this one
});
```

### Multiple students (one feedback per student)

```ts
import { analyzeTranscriptForAllStudents } from '@dialectic/debate-analysis';

const allFeedback = await analyzeTranscriptForAllStudents(transcript, {
  sessionId: 'sess_123',
});
// allFeedback[i] is feedback for the i-th student (by order of appearance)
```

Each student is evaluated separately; the full transcript is sent for context but the LLM is instructed to score and cite only that student's contributions.

### LLM provider (provider-agnostic)

The analyzer is OpenAI-compatible. Default is Perplexity; you can use OpenAI or any compatible endpoint.

**Perplexity (default):** Set `PERPLEXITY_API_KEY`. Default `baseURL` is `https://api.perplexity.ai`, default `model` is `sonar`.

**OpenAI:** Pass `apiKey`, `baseURL`, and `model` explicitly (or set `OPENAI_API_KEY` and override base/model):

```ts
const feedback = await analyzeTranscript(transcript, {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
});
```

**Environment:** `PERPLEXITY_API_KEY` or `OPENAI_API_KEY` (or pass `apiKey` in options).

---

## Integration points

- **When to run:** After the meeting ends, when the full transcript is available (e.g. from the agent runtime or a session manager that aggregates STT segments).
- **Where to call:** From the session manager, a post-session job, or an API route in the web app that "analyze session" triggers.
- **Storing results:** Save `StudentDebateFeedback` keyed by `sessionId` (and optionally `studentId`) so you can later support **progression across multiple meetings**.

---

## Progression (multiple sessions over time)

Store one `StudentDebateFeedback` per session per student. Use the package helper to aggregate and optionally get an LLM-written progression summary:

```ts
import { aggregateProgressionsAsync } from '@dialectic/debate-analysis';

// feedbacks: same student, multiple sessions (e.g. from your DB)
const progression = await aggregateProgressionsAsync(feedbacks, {
  generateProgressionSummary: true,
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
});
// progression.sessionIds, progression.feedbacks, progression.improvedCriteria,
// progression.focusAreas, progression.progressionSummary (narrative)
```

- **Sync:** `aggregateProgressions(feedbacks)` — computes `improvedCriteria` (score increased from first to last session) and `focusAreas` (score still low or decreased); no LLM call.
- **Async:** `aggregateProgressionsAsync(feedbacks, options)` — same, and if `generateProgressionSummary: true` and an API key is set, calls the LLM to fill in `progressionSummary`.

---

## Dependencies

- **@dialectic/shared** — `MeetingTranscript`, `TranscriptSegment`.
- **LLM API** — Perplexity (default), OpenAI, or any OpenAI-compatible chat-completions endpoint.

No front-end dependencies; use from Node or from a serverless/API route.
