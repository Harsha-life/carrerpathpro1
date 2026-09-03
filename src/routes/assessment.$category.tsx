import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  isCategory,
  scoreAttempt,
  toOptions,
  type QuestionRow,
} from "@/lib/assessments";

export const Route = createFileRoute("/assessment/$category")({
  head: () => ({
    meta: [
      { title: "Assessment — PathFinder AI" },
      { name: "description", content: "Take a skill, aptitude or personality assessment and get instant scoring." },
      { property: "og:title", content: "Assessment — PathFinder AI" },
      { property: "og:description", content: "Answer calibrated questions and see your score immediately." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { category } = useParams({ from: "/assessment/$category" });
  const { user, loading } = useRequireAuth();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const valid = isCategory(category);

  const { data: questions } = useQuery({
    queryKey: ["questions", category],
    enabled: valid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_questions")
        .select("id, category, prompt, options, correct_index, trait, sort_order")
        .eq("category", category)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as QuestionRow[];
    },
  });

  if (loading) return null;

  if (!valid) {
    return (
      <AppShell>
        <PageHeader title="Unknown assessment" subtitle="Pick a track from your dashboard." />
      </AppShell>
    );
  }

  const meta = CATEGORY_META[category];
  const list = questions ?? [];
  const current = list[index];
  const answeredCount = Object.keys(answers).length;

  const submit = async () => {
    if (!user || list.length === 0) return;
    setSubmitting(true);
    const { score, maxScore, traits } = scoreAttempt(list, answers);
    const { error } = await supabase.from("assessment_attempts").insert({
      user_id: user.id,
      category,
      score,
      max_score: maxScore,
      answers,
      traits,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Assessment submitted");
    navigate({ to: "/results" });
  };

  return (
    <AppShell>
      <PageHeader title={meta.title} subtitle={meta.blurb} />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading questions…</p>
      ) : (
        <div className="panel max-w-2xl p-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {index + 1} of {list.length}
            </span>
            <span>{answeredCount} answered</span>
          </div>
          <Progress value={((index + 1) / list.length) * 100} className="mt-3" />

          <h2 className="mt-6 text-lg font-semibold">{current?.prompt}</h2>
          <div className="mt-4 grid gap-2">
            {toOptions(current?.options).map((opt, i) => {
              const selected = current && answers[current.id] === i;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => current && setAnswers({ ...answers, [current.id]: i })}
                  className={cn(
                    "rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition-colors hover:border-primary/60",
                    selected && "border-primary bg-secondary text-foreground",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              Previous
            </Button>
            {index < list.length - 1 ? (
              <Button onClick={() => setIndex((i) => i + 1)}>Next</Button>
            ) : (
              <Button onClick={submit} disabled={submitting || answeredCount < list.length}>
                {submitting ? "Submitting…" : "Submit assessment"}
              </Button>
            )}
          </div>
          {answeredCount < list.length && index === list.length - 1 && (
            <p className="mt-3 text-xs text-muted-foreground">Answer every question to submit.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
