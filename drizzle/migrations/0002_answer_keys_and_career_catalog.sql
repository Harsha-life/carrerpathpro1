-- 1. Move the quiz answer key into a protected table
CREATE TABLE public.assessment_answer_keys (
  question_id uuid PRIMARY KEY REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  correct_index integer NOT NULL
);

GRANT ALL ON public.assessment_answer_keys TO service_role;
ALTER TABLE public.assessment_answer_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage answer keys" ON public.assessment_answer_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.assessment_answer_keys (question_id, correct_index)
SELECT id, correct_index FROM public.assessment_questions WHERE correct_index IS NOT NULL;

REVOKE ALL (correct_index) ON public.assessment_questions FROM anon, authenticated;

-- 2. Curated careers catalog
CREATE TABLE public.career_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  onet_code text,
  summary text NOT NULL,
  core_skills text[] NOT NULL DEFAULT '{}',
  median_salary_usd integer,
  outlook text,
  source_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.catalog_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  provider text NOT NULL,
  level text NOT NULL DEFAULT 'Beginner',
  skills text[] NOT NULL DEFAULT '{}',
  url text NOT NULL,
  career_slug text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.catalog_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  seniority text NOT NULL DEFAULT 'Entry',
  skills text[] NOT NULL DEFAULT '{}',
  url text,
  career_slug text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.career_paths TO anon, authenticated;
GRANT SELECT ON public.catalog_courses TO anon, authenticated;
GRANT SELECT ON public.catalog_jobs TO anon, authenticated;
GRANT ALL ON public.career_paths TO service_role;
GRANT ALL ON public.catalog_courses TO service_role;
GRANT ALL ON public.catalog_jobs TO service_role;

ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active careers" ON public.career_paths FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "anyone reads active courses" ON public.catalog_courses FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "anyone reads active jobs" ON public.catalog_jobs FOR SELECT TO anon, authenticated USING (is_active);

CREATE POLICY "admins manage careers" ON public.career_paths FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage courses" ON public.catalog_courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage jobs" ON public.catalog_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
