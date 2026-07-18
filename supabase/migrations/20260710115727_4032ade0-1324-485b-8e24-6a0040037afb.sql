
CREATE TABLE public.group_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_id)
);

GRANT SELECT, INSERT, DELETE ON public.group_blocks TO authenticated;
GRANT ALL ON public.group_blocks TO service_role;

ALTER TABLE public.group_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher manages group blocks"
  ON public.group_blocks
  FOR ALL
  USING (public.is_group_teacher(group_id, auth.uid()))
  WITH CHECK (public.is_group_teacher(group_id, auth.uid()));
