import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useRequireAuth } from "@/hooks/useAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — PathFinder AI" },
      { name: "description", content: "Platform oversight: learners, assessment attempts and question bank health." },
      { property: "og:title", content: "Admin — PathFinder AI" },
      { property: "og:description", content: "Manage users, questions and platform activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useRequireAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const [profiles, attempts, questions, recs] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50),
        supabase
          .from("assessment_attempts")
          .select("*")
          .order("completed_at", { ascending: false })
          .limit(50),
        supabase.from("assessment_questions").select("id, category, is_active"),
        supabase.from("recommendations").select("id"),
      ]);
      const [careers, courses, jobs] = await Promise.all([
        supabase.from("career_paths").select("id", { count: "exact", head: true }),
        supabase.from("catalog_courses").select("id", { count: "exact", head: true }),
        supabase.from("catalog_jobs").select("id", { count: "exact", head: true }),
      ]);
      return {
        profiles: profiles.data ?? [],
        attempts: attempts.data ?? [],
        questions: questions.data ?? [],
        reports: recs.data?.length ?? 0,
        careers: careers.count ?? 0,
        courses: courses.count ?? 0,
        jobs: jobs.count ?? 0,
      };
    },
  });

  if (loading) return null;

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader
          title="Admin"
          subtitle="This area is restricted to platform administrators. Ask an admin to grant your account the admin role."
        />
      </AppShell>
    );
  }

  const stats = [
    ["Learners", data?.profiles.length ?? 0],
    ["Attempts", data?.attempts.length ?? 0],
    ["Questions", data?.questions.length ?? 0],
    ["AI reports", data?.reports ?? 0],
  ] as const;

  return (
    <AppShell>
      <PageHeader title="Admin" subtitle="Oversight of learners, assessment activity and the question bank." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="panel p-5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <section className="panel mb-8 overflow-x-auto p-2">
        <h2 className="px-4 py-3 text-base font-semibold">Recent learners</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Target role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell>{p.target_role || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="panel overflow-x-auto p-2">
        <h2 className="px-4 py-3 text-base font-semibold">Recent attempts</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.attempts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {a.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.score} / {a.max_score}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(a.completed_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </AppShell>
  );
}
