import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Compass, GraduationCap, LineChart, Sparkles, Wrench } from "lucide-react";
import { Brand } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PathFinder AI — Smart Career Guidance & Skills Assessment" },
      {
        name: "description",
        content:
          "Assess your skills, aptitude and personality, then get AI-powered career paths, course and job recommendations tailored to you.",
      },
      { property: "og:title", content: "PathFinder AI — Smart Career Guidance" },
      {
        property: "og:description",
        content:
          "Skill, aptitude and personality assessments plus AI career prediction, course and job recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: Wrench, title: "Skill assessment", body: "Benchmark practical ability across engineering, data and product tracks." },
  { icon: Brain, title: "Aptitude analysis", body: "Numerical, logical and spatial reasoning scored instantly." },
  { icon: Sparkles, title: "Personality profile", body: "Work style, resilience and collaboration mapped to eight traits." },
  { icon: Compass, title: "AI career prediction", body: "Ranked career paths with match scores and concrete next steps." },
  { icon: GraduationCap, title: "Course recommendations", body: "Targeted learning that closes your highest-priority skill gaps." },
  { icon: LineChart, title: "Progress tracking", body: "Every attempt stored so you can watch your profile improve." },
];

function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Brand />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="surface-hero">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-16 md:pt-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> AI-powered career intelligence
          </p>
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold md:text-6xl">
            Find the career that fits <span className="text-gradient">who you actually are</span>.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Take three short assessments — skills, aptitude and personality — and get a personalized
            roadmap of careers, courses and jobs generated from your real results.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Start free assessment <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">View dashboard</Link>
            </Button>
          </div>

          <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6">
            {[
              ["20", "calibrated questions"],
              ["3", "assessment tracks"],
              ["< 20 min", "to your first roadmap"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-semibold text-primary">{value}</dt>
                <dd className="text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-semibold md:text-3xl">Everything the platform does</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="panel p-6">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="panel glow flex flex-col items-start justify-between gap-6 p-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Ready to map your next move?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create an account, complete an assessment, and generate your AI guidance report.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/auth">
              Create account <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          PathFinder AI — your assessment data is private to your account.
        </div>
      </footer>
    </div>
  );
}
