import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Briefcase, GraduationCap, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateRecommendations } from "@/lib/recommendations.functions";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "AI Career Guidance — PathFinder AI" },
      { name: "description", content: "AI-generated career paths, skill gaps, recommended courses and jobs based on your assessments." },
      { property: "og:title", content: "AI Career Guidance — PathFinder AI" },
      { property: "og:description", content: "Personalized career prediction, courses and jobs from your assessment data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecommendationsPage,
});

type Career = {
  title: string;
  match: number;
  why: string;
  nextStep: string;
  medianSalaryUsd?: number | null;
  outlook?: string | null;
  url?: string | null;
};
type Course = { title: string; provider: string; level: string; why: string; url?: string | null };
type Job = {
  title: string;
  company: string;
  location: string;
  why: string;
  url?: string | null;
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
type Gap = { skill: string; priority: string; action: string };

function RecommendationsPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const generate = useServerFn(generateRecommendations);
  const [busy, setBusy] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ["recommendations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const run = async () => {
    setBusy(true);
    try {
      await generate();
      await qc.invalidateQueries({ queryKey: ["recommendations", user?.id] });
      toast.success("Your guidance report is ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate recommendations");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  const careers = (latest?.careers ?? []) as unknown as Career[];
  const courses = (latest?.courses ?? []) as unknown as Course[];
  const jobs = (latest?.jobs ?? []) as unknown as Job[];
  const gaps = (latest?.skill_gaps ?? []) as unknown as Gap[];

  return (
    <AppShell>
      <PageHeader
        title="AI Career Guidance"
        subtitle="Generated from your profile plus your latest skill, aptitude and personality results."
      />

      <div className="panel mb-8 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm font-medium">
            {latest ? "Last generated" : "No report yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {latest ? new Date(latest.created_at).toLocaleString() : "Complete an assessment first, then generate."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/results">View results</Link>
          </Button>
          <Button onClick={run} disabled={busy} size="sm">
            <Sparkles className="size-4" />
            {busy ? "Analyzing…" : latest ? "Regenerate" : "Generate report"}
          </Button>
        </div>
      </div>

      {latest && (
        <div className="grid gap-6">
          <section className="panel p-6">
            <h2 className="text-base font-semibold">Summary</h2>
            <p className="mt-2 text-sm text-muted-foreground">{latest.summary}</p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Target className="size-4 text-primary" /> Predicted career paths
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {careers.map((c) => (
                <article key={c.title} className="panel p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                    <Badge variant="secondary">{c.match}% match</Badge>
                  </div>
                  <Progress value={c.match} className="mt-3 h-1.5" />
                  {(c.medianSalaryUsd || c.outlook) && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {c.medianSalaryUsd ? `Median pay ${usd.format(c.medianSalaryUsd)}/yr` : null}
                      {c.medianSalaryUsd && c.outlook ? " · " : null}
                      {c.outlook}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">{c.why}</p>
                  <p className="mt-2 text-xs text-primary">Next step: {c.nextStep}</p>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-block text-xs font-medium text-accent underline underline-offset-4"
                    >
                      Occupation data
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">Skill gaps to close</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {gaps.map((g) => (
                <article key={g.skill} className="panel p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{g.skill}</h3>
                    <Badge variant="outline" className="capitalize">
                      {g.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{g.action}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <GraduationCap className="size-4 text-primary" /> Recommended courses
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {courses.map((c) => (
                <article key={c.title} className="panel p-5">
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {c.provider} · {c.level}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{c.why}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Briefcase className="size-4 text-primary" /> Recommended jobs
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {jobs.map((j) => (
                <article key={`${j.title}-${j.company}`} className="panel p-5">
                  <h3 className="text-sm font-semibold">{j.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {j.company} · {j.location}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{j.why}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
