import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_META, percent, type Category } from "@/lib/assessments";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results — PathFinder AI" },
      { name: "description", content: "Review every assessment attempt, score and trait breakdown in one timeline." },
      { property: "og:title", content: "Results — PathFinder AI" },
      { property: "og:description", content: "Scores and trait breakdowns from your skill, aptitude and personality tests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { user, loading } = useRequireAuth();

  const { data: attempts } = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select("*")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return null;

  return (
    <AppShell>
      <PageHeader title="Results" subtitle="Every attempt is stored so you can measure improvement over time." />

      {!attempts?.length ? (
        <div className="panel flex flex-col items-start gap-4 p-8">
          <p className="text-sm text-muted-foreground">No attempts yet — take your first assessment.</p>
          <Button asChild size="sm">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {attempts.map((a) => {
            const pct = percent(Number(a.score), Number(a.max_score));
            const traits = (a.traits ?? {}) as Record<string, number>;
            return (
              <article key={a.id} className="panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{CATEGORY_META[a.category as Category]?.title ?? a.category}</h2>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.completed_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {a.category === "personality" ? `${pct} profile index` : `${a.score} / ${a.max_score}`}
                  </Badge>
                </div>
                <Progress value={pct} className="mt-4" />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {Object.entries(traits).map(([trait, value]) => (
                    <div key={trait}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{trait}</span>
                        <span>{value}</span>
                      </div>
                      <Progress
                        value={a.category === "personality" ? Number(value) : Number(value) * 100}
                        className="mt-1 h-1.5"
                      />
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
          <div>
            <Button asChild>
              <Link to="/recommendations">Generate AI guidance</Link>
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
