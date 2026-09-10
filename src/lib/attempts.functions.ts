import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scoreAttempt, type QuestionRow } from "@/lib/assessments";

const inputSchema = z.object({
  category: z.enum(["skill", "aptitude", "personality"]),
  answers: z.record(z.string().uuid(), z.number().int().min(0).max(20)),
});

/** Scores server-side so the answer key (correct_index) never reaches the client. */
export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("assessment_questions")
      .select("id, category, prompt, options, trait, sort_order")
      .eq("category", data.category)
      .eq("is_active", true)
      .order("sort_order");

    if (qErr) throw new Error("Could not load assessment questions.");
    if (!questions || questions.length === 0) throw new Error("This assessment has no questions.");

    const { data: keys } = await supabaseAdmin
      .from("assessment_answer_keys")
      .select("question_id, correct_index")
      .in("question_id", questions.map((q) => q.id));

    const keyByQuestion = new Map((keys ?? []).map((k) => [k.question_id, k.correct_index]));
    const withKeys: QuestionRow[] = questions.map((q) => ({
      ...q,
      correct_index: keyByQuestion.get(q.id) ?? null,
    }));

    const { score, maxScore, traits } = scoreAttempt(withKeys, data.answers);

    const { error } = await supabase.from("assessment_attempts").insert({
      user_id: userId,
      category: data.category,
      score,
      max_score: maxScore,
      answers: data.answers,
      traits,
    });
    if (error) throw new Error("Could not save your attempt. Please try again.");

    return { score, maxScore };
  });
