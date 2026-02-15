/**
 * @dialectic/debate-analysis
 *
 * Post-meeting analysis of student debate/seminar performance using a rubric and LLM.
 * Designed to work with a full Zoom meeting transcript (e.g. from STT).
 */

export {
  analyzeTranscript,
  analyzeTranscriptForAllStudents,
  getStudentSpeakerIds,
} from './analyzer.js';
export type { AnalyzeTranscriptOptions } from './analyzer.js';

export {
  aggregateProgressions,
  aggregateProgressionsAsync,
} from './progression.js';
export type { AggregateProgressionsOptions } from './progression.js';

export {
  DEBATE_RUBRIC_CRITERIA,
  DEBATE_RUBRIC_VERSION,
  type RubricCriterion,
  type RubricScore,
} from './rubric.js';

export type {
  CitedExample,
  CriterionFeedback,
  StudentDebateFeedback,
  StudentProgressionSummary,
} from './types.js';
