/**
 * Aggregate multiple session feedbacks into a progression summary for one student.
 * Optionally calls the LLM to generate a short narrative progression summary.
 */

import type { StudentDebateFeedback, StudentProgressionSummary } from './types.js';

export interface AggregateProgressionsOptions {
  /** API key for optional LLM progression summary */
  apiKey?: string;
  /** Model name (e.g. sonar, gpt-4o) */
  model?: string;
  /** Base URL for chat completions (e.g. Perplexity, OpenAI) */
  baseURL?: string;
  /** If true and apiKey is set, call LLM to generate progressionSummary */
  generateProgressionSummary?: boolean;
}

const DEFAULT_BASE_URL = 'https://api.perplexity.ai';
const DEFAULT_MODEL = 'sonar';

function scoreByCriterion(feedback: StudentDebateFeedback): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of feedback.criteria) {
    m.set(c.criterionId, c.score);
  }
  return m;
}

/**
 * Aggregate feedbacks from multiple sessions into a single progression summary.
 * Feedbacks should be for one student (same studentId); they are sorted by analyzedAt.
 * Computes improvedCriteria (score increased from first to last) and focusAreas
 * (score still low or decreased). Optionally requests an LLM narrative summary.
 */
export function aggregateProgressions(
  feedbacks: StudentDebateFeedback[],
  options: AggregateProgressionsOptions = {}
): StudentProgressionSummary {
  if (feedbacks.length === 0) {
    throw new Error('aggregateProgressions requires at least one feedback');
  }

  const sorted = [...feedbacks].sort(
    (a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime()
  );
  const studentId =
    sorted[0].studentId ?? sorted[0].sessionId ?? 'unknown';
  const sessionIds = sorted
    .map((f) => f.sessionId)
    .filter((id): id is string => id != null && id !== '');

  const first = scoreByCriterion(sorted[0]!);
  const last = scoreByCriterion(sorted[sorted.length - 1]!);
  const criterionIds = new Set([...first.keys(), ...last.keys()]);

  const improvedCriteria: string[] = [];
  const focusAreas: string[] = [];
  for (const id of criterionIds) {
    const firstScore = first.get(id) ?? 0;
    const lastScore = last.get(id) ?? 0;
    if (lastScore > firstScore) improvedCriteria.push(id);
    if (lastScore <= 2 || lastScore < firstScore) focusAreas.push(id);
  }

  return {
    studentId,
    sessionIds,
    feedbacks: sorted,
    improvedCriteria: improvedCriteria.length > 0 ? improvedCriteria : undefined,
    focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
  };
}

/**
 * Async version: same as aggregateProgressions but optionally calls the LLM to
 * fill in progressionSummary. Pass generateProgressionSummary: true and apiKey
 * (or set PERPLEXITY_API_KEY / OPENAI_API_KEY).
 */
export async function aggregateProgressionsAsync(
  feedbacks: StudentDebateFeedback[],
  options: AggregateProgressionsOptions = {}
): Promise<StudentProgressionSummary> {
  const summary = aggregateProgressions(feedbacks, options);

  const apiKey =
    options.apiKey ??
    process.env.PERPLEXITY_API_KEY ??
    process.env.OPENAI_API_KEY;
  const shouldGenerate =
    options.generateProgressionSummary && apiKey && feedbacks.length >= 2;

  if (!shouldGenerate) {
    return summary;
  }

  const baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = options.model ?? DEFAULT_MODEL;

  const criteriaTable = summary.feedbacks
    .map((f, i) => {
      const sessionLabel = summary.sessionIds[i] ?? `Session ${i + 1}`;
      const scores = f.criteria.map((c) => `${c.criterionId}: ${c.score}`).join(', ');
      return `${sessionLabel}: overall ${f.overallScore}; ${scores}`;
    })
    .join('\n');

  const prompt = `You are an educator writing a brief progression summary for a student who participated in multiple debate/seminar sessions. Use only the following data. Write 2–4 sentences: what improved, what to focus on next, and encouragement. Be specific (mention criterion names if relevant). No JSON, just plain text.

Student ID: ${summary.studentId}
Sessions (chronological): ${summary.sessionIds.join(', ')}
Improved criteria (from first to last session): ${(summary.improvedCriteria ?? []).join(', ') || 'none noted'}
Focus areas (still low or regressed): ${(summary.focusAreas ?? []).join(', ') || 'none'}

Per-session snapshot:
${criteriaTable}`;

  try {
    const url = baseURL + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You write short, encouraging progression summaries for students. Output only the summary text, no labels or JSON.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM progression summary failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) {
      return { ...summary, progressionSummary: content };
    }
  } catch (e) {
    console.warn('Progression summary LLM call failed:', (e as Error).message);
  }
  return summary;
}
