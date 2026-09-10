import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3.7-flash";

type Career = {
  title: string;
  match: number;
  why: string;
  nextStep: string;
  medianSalaryUsd?: number | null;
  outlook?: string | null;
  url?: string | null;
};
type Course = {
  title: string;
  provider: string;
  level: string;
  why: string;
  url?: string | null;
};
type Job = {
  title: string;
  company: string;
  location: string;
  why: string;
  url?: string | null;
};

export type RecommendationPayload = {
  summary: string;
  careers: Career[];
  courses: Course[];
  jobs: Job[];
  skillGaps: { skill: string; priority: string; action: string }[];
};

const SYSTEM_PROMPT = `You are a career guidance analyst. Using the learner profile,
assessment results and the provided CATALOG of real careers, courses and open roles,
produce grounded, specific guidance.

HARD RULES:
- Only recommend items that exist in the catalog. Never invent a career, course,
  provider, company or job title that is not listed.
- Reference each item by its exact "id" from the catalog.
- Never invent scores or salaries; only the "match" number is your own judgement.

Return ONLY valid JSON matching this shape:
{
 "summary": string (2-3 sentences),
 "careers": [{"id":string,"match":number 0-100,"why":string,"nextStep":string}] (4 items),
 "courses": [{"id":string,"why":string}] (4 items),
 "jobs": [{"id":string,"why":string}] (4 items),
 "skillGaps": [{"skill":string,"priority":"high"|"medium"|"low","action":string}] (4 items)
}`;

export const generateRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: attempts }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("assessment_attempts")
        .select("category, score, max_score, traits, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(12),
    ]);

    if (!attempts || attempts.length === 0) {
      throw new Error("Complete at least one assessment before generating recommendations.");
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const userPrompt = JSON.stringify({
      profile: {
        fullName: profile?.full_name ?? null,
        education: profile?.education ?? null,
        experienceYears: profile?.experience_years ?? 0,
        interests: profile?.interests ?? [],
        targetRole: profile?.target_role ?? null,
        bio: profile?.bio ?? null,
      },
      assessments: attempts,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.status === 429) throw new Error("Rate limit reached. Try again in a minute.");
    if (response.status === 402) throw new Error("AI credits exhausted for this workspace.");
    if (!response.ok) throw new Error(`AI request failed (${response.status}).`);

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    let parsed: RecommendationPayload;
    try {
      parsed = JSON.parse(cleaned) as RecommendationPayload;
    } catch {
      throw new Error("AI returned an unexpected response. Please try again.");
    }

    const { data: saved, error } = await supabase
      .from("recommendations")
      .insert({
        user_id: userId,
        model: MODEL,
        summary: parsed.summary ?? "",
        careers: parsed.careers ?? [],
        courses: parsed.courses ?? [],
        jobs: parsed.jobs ?? [],
        skill_gaps: parsed.skillGaps ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return saved;
  });
