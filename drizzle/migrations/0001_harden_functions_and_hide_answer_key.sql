-- 1. Fix mutable search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin new.updated_at = now(); return new; end;
$function$;

-- 2. Lock down EXECUTE on SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role must stay callable by signed-in users: RLS policies invoke it as the caller
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Anonymous readers must not depend on has_role
DROP POLICY IF EXISTS "anyone reads active questions" ON public.assessment_questions;
CREATE POLICY "anon reads active questions"
  ON public.assessment_questions FOR SELECT TO anon
  USING (is_active);
CREATE POLICY "users read active questions"
  ON public.assessment_questions FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Hide the answer key: column-level grants exclude correct_index
REVOKE ALL ON TABLE public.assessment_questions FROM anon, authenticated;
GRANT SELECT (id, category, prompt, options, trait, sort_order, is_active, created_at)
  ON public.assessment_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated; -- still gated by admin RLS policy
GRANT ALL ON TABLE public.assessment_questions TO service_role;
