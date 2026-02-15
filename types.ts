/**
 * Types for debate analysis output (feedback for students).
 */

import type { RubricScore } from './rubric.js';

export interface CitedExample {
  /** Quote or paraphrase from the transcript */
  quote: string;
  /** Which criterion this example illustrates */
  criterionId: string;
  /** Whether this is a strength (true) or area for improvement (false) */
  isStrength: boolean;
  /** Optional: segment id or short context (e.g. "in response to Socrates") */
  context?: string;
}

export interface CriterionFeedback {
  criterionId: string;
  score: RubricScore;
  /** Short written feedback for this criterion */
  feedback: string;
  /** Specific examples from the transcript */
  examples: CitedExample[];
}

export interface StudentDebateFeedback {
  /** Session or transcript this feedback is for (for future progression) */
  sessionId?: string;
  /** Student identifier if available */
  studentId?: string;
  /** When the analysis was generated (ISO string) */
  analyzedAt: string;
  /** Rubric version used */
  rubricVersion: string;
  /** Overall score 1–5 (e.g. average or holistic) */
  overallScore: RubricScore;
  /** One-paragraph overall summary */
  overallSummary: string;
  /** Per-criterion scores and feedback */
  criteria: CriterionFeedback[];
  /** Top 2–4 strengths with cited examples */
  strengths: string[];
  /** Top 2–4 areas for improvement with cited examples */
  areasForImprovement: string[];
  /** Optional: suggested next steps or practice focus */
  suggestedNextSteps?: string[];
}

/**
 * For future use: aggregate multiple session analyses to evaluate progression.
 * Store one StudentDebateFeedback per session and compute trends over time.
 */
export interface StudentProgressionSummary {
  studentId: string;
  /** Session IDs in chronological order */
  sessionIds: string[];
  /** Feedback for each session (same order as sessionIds) */
  feedbacks: StudentDebateFeedback[];
  /** Criterion IDs that improved from first to last session */
  improvedCriteria?: string[];
  /** Criterion IDs that regressed or stayed low */
  focusAreas?: string[];
  /** Optional narrative summary of progression (e.g. from an LLM) */
  progressionSummary?: string;
}
