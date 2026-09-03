export type Category = "skill" | "aptitude" | "personality";

export const CATEGORY_META: Record<
  Category,
  { title: string; blurb: string; icon: string; minutes: number }
> = {
  skill: {
    title: "Skill Assessment",
    blurb: "Measure what you can already do across engineering, data and product.",
    icon: "Wrench",
    minutes: 6,
  },
  aptitude: {
    title: "Aptitude Test",
    blurb: "Numerical, logical and spatial reasoning under light time pressure.",
    icon: "Brain",
    minutes: 8,
  },
  personality: {
    title: "Personality Test",
    blurb: "Understand your work style, collaboration and resilience profile.",
    icon: "Sparkles",
    minutes: 4,
  },
};

export const CATEGORIES: Category[] = ["skill", "aptitude", "personality"];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as string[]).includes(value);
}

export type QuestionRow = {
  id: string;
  category: string;
  prompt: string;
  options: unknown;
  correct_index: number | null;
  trait: string | null;
  sort_order: number;
};

export function toOptions(options: unknown): string[] {
  return Array.isArray(options) ? (options as string[]) : [];
}

export type ScoreResult = {
  score: number;
  maxScore: number;
  traits: Record<string, number>;
};

/** Objective categories score correct answers; personality scores Likert traits 0-100. */
export function scoreAttempt(
  questions: QuestionRow[],
  answers: Record<string, number>,
): ScoreResult {
  const traits: Record<string, number> = {};

  if (questions[0]?.category === "personality") {
    for (const q of questions) {
      const options = toOptions(q.options);
      const picked = answers[q.id];
      if (picked === undefined || !q.trait) continue;
      const pct = Math.round((picked / Math.max(options.length - 1, 1)) * 100);
      traits[q.trait] = pct;
    }
    const values = Object.values(traits);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { score: Math.round(avg), maxScore: 100, traits };
  }

  let score = 0;
  for (const q of questions) {
    const correct = q.correct_index !== null && answers[q.id] === q.correct_index;
    if (correct) score += 1;
    if (q.trait) traits[q.trait] = (traits[q.trait] ?? 0) + (correct ? 1 : 0);
  }
  return { score, maxScore: questions.length, traits };
}

export function percent(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}
