/**
 * Post-meeting debate analysis using an LLM (e.g. Perplexity).
 * Consumes a full meeting transcript and returns structured feedback per rubric.
 */

import type { MeetingTranscript, SpeakerId, TranscriptSegment } from '@dialectic/shared';
import {
  DEBATE_RUBRIC_CRITERIA,
  DEBATE_RUBRIC_VERSION,
  type RubricScore,
} from './rubric.js';
import type { CitedExample, CriterionFeedback, StudentDebateFeedback } from './types.js';

export interface AnalyzeTranscriptOptions {
  /** API key for the LLM. Default: process.env.PERPLEXITY_API_KEY or process.env.OPENAI_API_KEY */
  apiKey?: string;
  /** Model name. Default: sonar (Perplexity). For OpenAI use gpt-4o etc. */
  model?: string;
  /** Base URL for API. Default: https://api.perplexity.ai (OpenAI-compatible) */
  baseURL?: string;
  /** Session ID to attach to feedback (for progression) */
  sessionId?: string;
  /** Student identifier for storage/progression */
  studentId?: string;
  /** When transcript has multiple students, evaluate only this speaker (speakerId). Required for multi-student transcripts. */
  studentSpeakerId?: string;
}

const DEFAULT_BASE_URL = 'https://api.perplexity.ai';
const DEFAULT_MODEL = 'sonar';

function formatTranscriptForPrompt(transcript: MeetingTranscript): string {
  return transcript.segments
    .map((s: TranscriptSegment) => {
      const role = s.speakerRole === 'student' ? 'Student' : s.speakerRole === 'agent' ? 'Agent' : 'Other';
      const time =
        s.startTimeSeconds != null
          ? ` [${Math.floor(s.startTimeSeconds / 60)}:${String(Math.floor(s.startTimeSeconds % 60)).padStart(2, '0')}]`
          : '';
      return `${role} (${s.speakerId})${time}: ${s.text}`;
    })
    .join('\n');
}

function buildSystemPrompt(): string {
  const criteriaText = DEBATE_RUBRIC_CRITERIA.map(
    (c) =>
      `- **${c.name}** (id: ${c.id}): ${c.description}\n  Excellent: ${c.excellentDescription}\n  Needs improvement: ${c.needsImprovementDescription}`
  ).join('\n\n');

  return `You are an expert educator evaluating a student's performance in a seminar or debate (e.g. with AI personas in a Zoom meeting). You will receive a full meeting transcript and must produce a thorough, fair analysis.

## Rubric criteria (score each 1–5: 1 = needs improvement, 5 = excellent)

${criteriaText}

## Your task

1. You will be told which single student to evaluate (by speakerId). Evaluate ONLY that student. Ignore other students' contributions for scoring; use the full transcript only for context (e.g. what agents or others said to this student).
2. For each criterion above, assign a score 1–5 and write 1–3 sentences of feedback. Include at least one specific cited example (quote or close paraphrase from the transcript) from THIS student—either something they did well or something to improve.
3. Write an overall summary (one short paragraph) and an overall score 1–5 for this student only.
4. List 2–4 key strengths with brief citations from this student's contributions.
5. List 2–4 areas for improvement with brief citations from this student's contributions.
6. Optionally suggest 1–3 concrete next steps or practice focuses.

You MUST respond with valid JSON only, no markdown code fence, no extra text. Use this exact structure (all fields required unless marked optional):

{
  "overallScore": 1-5,
  "overallSummary": "string",
  "criteria": [
    {
      "criterionId": "string (one of the rubric ids)",
      "score": 1-5,
      "feedback": "string",
      "examples": [
        {
          "quote": "exact or close quote from transcript",
          "criterionId": "string",
          "isStrength": true or false,
          "context": "optional string"
        }
      ]
    }
  ],
  "strengths": ["string", "..."],
  "areasForImprovement": ["string", "..."],
  "suggestedNextSteps": ["string", "..."]
}`;
}

function buildUserPrompt(transcript: MeetingTranscript, studentSpeakerId?: string): string {
  const body = formatTranscriptForPrompt(transcript);
  const focus =
    studentSpeakerId != null
      ? `\n\n**Evaluate ONLY the student whose speakerId is: "${studentSpeakerId}".** Score and cite only this student's contributions. Use the rest of the transcript for context (e.g. what agents said) but do not score other students.\n\n`
      : '\n\nIdentify the student(s) in the transcript; if there is more than one, evaluate the primary or only student. (For multiple students, the caller should run analysis once per student with studentSpeakerId set.)\n\n';
  return `Below is the full meeting transcript. Analyze the student's debate/seminar performance using the rubric and output the required JSON.${focus}## Transcript\n\n${body}`;
}

function clampScore(n: number): RubricScore {
  const v = Math.round(n);
  if (v <= 1) return 1;
  if (v >= 5) return 5;
  return v as RubricScore;
}

function parseAndValidateAnalysis(
  raw: string,
  sessionId?: string,
  studentId?: string
): StudentDebateFeedback {
  let data: unknown;
  try {
    const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '');
    data = JSON.parse(trimmed) as unknown;
  } catch (e) {
    throw new Error(`LLM did not return valid JSON: ${(e as Error).message}`);
  }

  if (data == null || typeof data !== 'object') {
    throw new Error('LLM response was not an object');
  }

  const obj = data as Record<string, unknown>;
  const overallScore = clampScore(Number(obj.overallScore) || 3);
  const overallSummary = String(obj.overallSummary ?? '');
  const rawCriteria = Array.isArray(obj.criteria) ? obj.criteria : [];
  const criteria: CriterionFeedback[] = rawCriteria
    .filter((c): c is Record<string, unknown> => c != null && typeof c === 'object')
    .map((c) => {
      const criterionId = String(c.criterionId ?? '');
      const score = clampScore(Number(c.score) || 3);
      const feedback = String(c.feedback ?? '');
      const rawExamples = Array.isArray(c.examples) ? c.examples : [];
      const examples: CitedExample[] = rawExamples
        .filter((e): e is Record<string, unknown> => e != null && typeof e === 'object')
        .map((e) => ({
          quote: String(e.quote ?? ''),
          criterionId: String(e.criterionId ?? criterionId),
          isStrength: Boolean(e.isStrength),
          context: e.context != null ? String(e.context) : undefined,
        }))
        .filter((e) => e.quote.length > 0);
      return { criterionId, score, feedback, examples };
    })
    .filter((c) => c.criterionId.length > 0);

  const strengths = Array.isArray(obj.strengths)
    ? (obj.strengths as unknown[]).map((s) => String(s)).filter(Boolean)
    : [];
  const areasForImprovement = Array.isArray(obj.areasForImprovement)
    ? (obj.areasForImprovement as unknown[]).map((a) => String(a)).filter(Boolean)
    : [];
  const suggestedNextSteps = Array.isArray(obj.suggestedNextSteps)
    ? (obj.suggestedNextSteps as unknown[]).map((s) => String(s)).filter(Boolean)
    : undefined;

  return {
    sessionId,
    studentId,
    analyzedAt: new Date().toISOString(),
    rubricVersion: DEBATE_RUBRIC_VERSION,
    overallScore,
    overallSummary: overallSummary || 'No summary provided.',
    criteria,
    strengths,
    areasForImprovement,
    suggestedNextSteps: suggestedNextSteps?.length ? suggestedNextSteps : undefined,
  };
}

/**
 * Analyze a full meeting transcript and return structured student debate feedback
 * using the rubric. Calls the configured LLM (default: Perplexity).
 */
export async function analyzeTranscript(
  transcript: MeetingTranscript,
  options: AnalyzeTranscriptOptions = {}
): Promise<StudentDebateFeedback> {
  const apiKey =
    options.apiKey ??
    process.env.PERPLEXITY_API_KEY ??
    process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing LLM API key. Set PERPLEXITY_API_KEY or OPENAI_API_KEY, or pass apiKey in options.'
    );
  }

  const baseURL = options.baseURL ?? DEFAULT_BASE_URL;
  const model = options.model ?? DEFAULT_MODEL;
  const sessionId = options.sessionId ?? transcript.sessionId;
  const studentId = options.studentId;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(transcript, options.studentSpeakerId);

  const url = baseURL.replace(/\/$/, '') + '/chat/completions';
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    ...(baseURL.includes('perplexity')
      ? { response_format: { type: 'json_object' } }
      : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM returned empty or invalid response');
  }

  return parseAndValidateAnalysis(content, sessionId, studentId);
}

/**
 * Get unique speakerIds that have role 'student' in the transcript.
 */
export function getStudentSpeakerIds(transcript: MeetingTranscript): SpeakerId[] {
  const ids = new Set<SpeakerId>();
  for (const s of transcript.segments) {
    if (s.speakerRole === 'student') ids.add(s.speakerId);
  }
  return [...ids];
}

/**
 * Analyze the transcript separately for each student. Runs one LLM call per student;
 * each evaluation uses the full transcript for context but scores only that student.
 */
export async function analyzeTranscriptForAllStudents(
  transcript: MeetingTranscript,
  options: AnalyzeTranscriptOptions = {}
): Promise<StudentDebateFeedback[]> {
  const studentIds = getStudentSpeakerIds(transcript);
  if (studentIds.length === 0) {
    return [];
  }
  const results: StudentDebateFeedback[] = [];
  for (const speakerId of studentIds) {
    const feedback = await analyzeTranscript(transcript, {
      ...options,
      studentSpeakerId: speakerId,
      studentId: options.studentId ?? speakerId,
    });
    results.push(feedback);
  }
  return results;
}
