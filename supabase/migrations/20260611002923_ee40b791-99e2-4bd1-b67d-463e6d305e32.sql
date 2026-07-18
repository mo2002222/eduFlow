
-- Restore notification triggers (lost from DB)
DROP TRIGGER IF EXISTS trg_session_notify ON public.sessions;
CREATE TRIGGER trg_session_notify AFTER INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.on_session_insert();

DROP TRIGGER IF EXISTS trg_assignment_notify ON public.assignments;
CREATE TRIGGER trg_assignment_notify AFTER INSERT ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.on_assignment_insert();

DROP TRIGGER IF EXISTS trg_exam_notify ON public.exams;
CREATE TRIGGER trg_exam_notify AFTER INSERT ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.on_exam_insert();

DROP TRIGGER IF EXISTS trg_grade_notify ON public.grades;
CREATE TRIGGER trg_grade_notify AFTER INSERT ON public.grades
FOR EACH ROW EXECUTE FUNCTION public.on_grade_insert();

-- Ensure handle_new_user trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- New: notify on file uploads
CREATE OR REPLACE FUNCTION public.on_file_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    PERFORM public.notify_group_members(
      NEW.group_id,
      'file',
      'New file: ' || NEW.name,
      NULL,
      '/groups/' || NEW.group_id::text
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_file_notify ON public.files;
CREATE TRIGGER trg_file_notify AFTER INSERT ON public.files
FOR EACH ROW EXECUTE FUNCTION public.on_file_insert();

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "notif own delete" ON public.notifications;
CREATE POLICY "notif own delete" ON public.notifications
FOR DELETE TO authenticated USING (user_id = auth.uid());
