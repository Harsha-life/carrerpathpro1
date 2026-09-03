import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Brain, Sparkles, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES, CATEGORY_META, percent, type Category } from "@/lib/assessments";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PathFinder AI" },
      { name: "description", content: "Track assessment progress and jump into your next career step." },
      { property: "og:title", content: "Dashboard — PathFinder AI" },
      { property: "og:description", content: "Your assessment progress and AI career guidance in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const ICONS = { skill: Wrench, aptitude: Brain, personality: Sparkles };

function Dashboard() {
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

  const latest = (c: Category) => attempts?.find((a) => a.category === c);
  const completed = CATEGORIES.filter((c) => latest(c)).length;

  if (loading) return null;

  return (
    <AppShell>
      <PageHeader
        title={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}`}
        subtitle="Complete the three assessment tracks, then generate an AI guidance report from your results."
      />

      <div className="panel mb-8 p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile completeness</span>
          <span className="text-muted-foreground">{completed} of 3 assessments</span>
        </div>
        <Progress value={(completed / 3) * 100} className="mt-4" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link to="/recommendations">
              Generate AI guidance <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/profile">Update profile</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c];
          const last = latest(c);
          const pct = last ? percent(Number(last.score), Number(last.max_score)) : 0;
          return (
            <article key={c} className="panel flex flex-col p-6">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{CATEGORY_META[c].title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{CATEGORY_META[c].blurb}</p>
              <div className="mt-4 text-sm">
                {last ? (
                  <span className="text-primary">Last score {pct}%</span>
                ) : (
                  <span className="text-muted-foreground">Not started · ~{CATEGORY_META[c].minutes} min</span>
                )}
              </div>
              <Button asChild size="sm" variant={last ? "outline" : "default"} className="mt-4">
                <Link to="/assessment/$category" params={{ category: c }}>
                  {last ? "Retake" : "Start"}
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
