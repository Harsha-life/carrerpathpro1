import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — PathFinder AI" },
      { name: "description", content: "Manage the education, experience and interests that shape your AI career guidance." },
      { property: "og:title", content: "My Profile — PathFinder AI" },
      { property: "og:description", content: "Keep your career profile current for sharper recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    education: "",
    experience_years: 0,
    interests: "",
    target_role: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      education: profile.education ?? "",
      experience_years: profile.experience_years ?? 0,
      interests: (profile.interests ?? []).join(", "),
      target_role: profile.target_role ?? "",
      bio: profile.bio ?? "",
    });
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: form.full_name,
      education: form.education,
      experience_years: Number(form.experience_years) || 0,
      interests: form.interests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      target_role: form.target_role,
      bio: form.bio,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  if (loading) return null;

  return (
    <AppShell>
      <PageHeader
        title="My Profile"
        subtitle="The richer this is, the more specific your AI career, course and job recommendations become."
      />
      <form onSubmit={save} className="panel grid max-w-2xl gap-5 p-6">
        <div className="grid gap-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="education">Education</Label>
            <Input
              id="education"
              placeholder="B.Tech Computer Science"
              value={form.education}
              onChange={(e) => setForm({ ...form, education: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="experience_years">Years of experience</Label>
            <Input
              id="experience_years"
              type="number"
              min={0}
              value={form.experience_years}
              onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="target_role">Target role</Label>
          <Input
            id="target_role"
            placeholder="Data Analyst"
            value={form.target_role}
            onChange={(e) => setForm({ ...form, target_role: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="interests">Interests (comma separated)</Label>
          <Input
            id="interests"
            placeholder="machine learning, product design, fintech"
            value={form.interests}
            onChange={(e) => setForm({ ...form, interests: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">About you</Label>
          <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <Button type="submit" disabled={saving} className="justify-self-start">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </AppShell>
  );
}
