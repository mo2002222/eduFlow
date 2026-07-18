-- Allow students to self-mark attendance for a session they belong to (group member).
CREATE POLICY "att student self mark"
ON public.attendance_records
FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND public.is_group_member(public.session_group(session_id), auth.uid())
);

CREATE POLICY "att student self update"
ON public.attendance_records
FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Teachers should be able to see attendance for all students in their group
-- (already covered by "att teacher all" ALL policy, which includes SELECT).

-- Allow students to read attendance for sessions in groups they're a member of,
-- so they can see per-session attended counts. Restrict to their own group's data.
CREATE POLICY "att group member read"
ON public.attendance_records
FOR SELECT TO authenticated
USING (public.is_group_member(public.session_group(session_id), auth.uid()));
