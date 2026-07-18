CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_group_created_idx ON public.messages(group_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg select group members or teacher" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_group_teacher(group_id, auth.uid()) OR public.is_group_member(group_id, auth.uid()));

CREATE POLICY "msg insert group members or teacher" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (public.is_group_teacher(group_id, auth.uid()) OR public.is_group_member(group_id, auth.uid()))
  );

CREATE POLICY "msg delete own or teacher" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_group_teacher(group_id, auth.uid()));
