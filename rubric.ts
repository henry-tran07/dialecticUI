/**
 * Rubric for evaluating student debate/seminar performance.
 * Used to prompt the LLM and to structure the analysis output.
 */

export const DEBATE_RUBRIC_VERSION = '1.0';

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  /** What "excellent" looks like (for LLM guidance) */
  excellentDescription: string;
  /** What "needs improvement" looks like */
  needsImprovementDescription: string;
  /** 1–5 scale label (optional; default 1=Needs improvement, 5=Excellent) */
  scaleLabels?: Record<number, string>;
}

export const DEBATE_RUBRIC_CRITERIA: RubricCriterion[] = [
  {
    id: 'chain_of_reasoning',
    name: 'Chain of reasoning',
    description: 'Whether the student builds a clear step-by-step argument rather than jumping to conclusions.',
    excellentDescription: 'Moves logically from premise to conclusion; explicitly connects ideas; acknowledges assumptions.',
    needsImprovementDescription: 'Conclusions stated without clear steps; logical leaps; missing links between claims.',
    scaleLabels: {
      1: 'No clear reasoning chain',
      2: 'Some steps present but gaps or leaps',
      3: 'Adequate progression with minor gaps',
      4: 'Clear chain with minor assumptions unstated',
      5: 'Explicit, well-connected reasoning from premise to conclusion',
    },
  },
  {
    id: 'sound_evidence',
    name: 'Sound evidence',
    description: 'Use of relevant, accurate, and well-sourced evidence to support claims.',
    excellentDescription: 'Cites specific facts, examples, or sources; evidence directly supports claims; distinguishes fact from interpretation.',
    needsImprovementDescription: 'Vague or unsupported claims; evidence irrelevant or misused; no distinction between fact and opinion.',
    scaleLabels: {
      1: 'No or irrelevant evidence',
      2: 'Evidence mentioned but weak or off-point',
      3: 'Some relevant evidence; support is partial',
      4: 'Good use of evidence with minor gaps',
      5: 'Relevant, accurate, well-deployed evidence',
    },
  },
  {
    id: 'clarity_of_response',
    name: 'Clarity of response',
    description: 'How clearly and coherently the student expresses their position and responds to others.',
    excellentDescription: 'Precise language; direct answers to questions; structure (e.g. "First… Second…") where helpful.',
    needsImprovementDescription: 'Vague or rambling; doesn\'t directly address the question; hard to follow.',
    scaleLabels: {
      1: 'Very unclear or off-topic',
      2: 'Partially clear; audience must infer meaning',
      3: 'Generally clear with some ambiguity',
      4: 'Clear with minor imprecision',
      5: 'Precise, direct, and easy to follow',
    },
  },
  {
    id: 'logical_consistency',
    name: 'Logical consistency',
    description: 'Absence of contradictions and internal coherence of the argument.',
    excellentDescription: 'Positions and claims are consistent throughout; acknowledges and resolves apparent tensions.',
    needsImprovementDescription: 'Contradicts earlier claims; inconsistent premises; unacknowledged tensions.',
    scaleLabels: {
      1: 'Major contradictions or incoherence',
      2: 'Noticeable inconsistencies',
      3: 'Mostly consistent with some slips',
      4: 'Consistent with minor ambiguities',
      5: 'Fully consistent; tensions acknowledged and addressed',
    },
  },
  {
    id: 'engagement_and_civility',
    name: 'Engagement and civility',
    description: 'How well the student engages with others\' ideas and maintains respectful, constructive dialogue.',
    excellentDescription: 'Directly engages others\' points; asks clarifying questions; respectful even when disagreeing.',
    needsImprovementDescription: 'Talks past others; dismissive or uncivil; doesn\'t build on or challenge ideas constructively.',
    scaleLabels: {
      1: 'Disengaged or disrespectful',
      2: 'Limited engagement; some civility issues',
      3: 'Adequate engagement and tone',
      4: 'Good engagement; respectful and constructive',
      5: 'Highly engaged; models civil, substantive dialogue',
    },
  },
  {
    id: 'relevance_and_focus',
    name: 'Relevance and focus',
    description: 'Staying on topic and addressing the question or prompt at hand.',
    excellentDescription: 'Responses directly address the question; tangents are brief and purposeful.',
    needsImprovementDescription: 'Frequently off-topic; doesn\'t answer what was asked; tangents dominate.',
    scaleLabels: {
      1: 'Mostly irrelevant or unfocused',
      2: 'Partially relevant; significant drift',
      3: 'Generally on topic with some drift',
      4: 'Focused with minor tangents',
      5: 'Highly relevant and focused',
    },
  },
  {
    id: 'critical_thinking',
    name: 'Critical thinking',
    description: 'Willingness to question assumptions, consider counterarguments, and revise in light of new information.',
    excellentDescription: 'Surfaces assumptions; considers objections; updates views when evidence warrants.',
    needsImprovementDescription: 'Defensive; ignores counterarguments; doesn\'t question own or others\' assumptions.',
    scaleLabels: {
      1: 'No visible critical reflection',
      2: 'Minimal engagement with alternatives',
      3: 'Some consideration of other views',
      4: 'Good critical engagement; minor blind spots',
      5: 'Strong critical reflection and openness to revision',
    },
  },
];

/** Scale: 1 = needs improvement, 5 = excellent (used in feedback) */
export type RubricScore = 1 | 2 | 3 | 4 | 5;
