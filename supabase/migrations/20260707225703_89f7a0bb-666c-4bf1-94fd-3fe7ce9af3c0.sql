
-- Attach the existing notify functions to their tables (they weren't triggered before)
DROP TRIGGER IF EXISTS trg_notify_session_insert ON public.sessions;
CREATE TRIGGER trg_notify_session_insert AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.on_session_insert();

DROP TRIGGER IF EXISTS trg_notify_file_insert ON public.files;
CREATE TRIGGER trg_notify_file_insert AFTER INSERT ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.on_file_insert();

DROP TRIGGER IF EXISTS trg_notify_assignment_insert ON public.assignments;
CREATE TRIGGER trg_notify_assignment_insert AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.on_assignment_insert();

DROP TRIGGER IF EXISTS trg_notify_exam_insert ON public.exams;
CREATE TRIGGER trg_notify_exam_insert AFTER INSERT ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.on_exam_insert();

DROP TRIGGER IF EXISTS trg_notify_grade_insert ON public.grades;
CREATE TRIGGER trg_notify_grade_insert AFTER INSERT ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.on_grade_insert();

-- Notify teacher when a new student joins
CREATE OR REPLACE FUNCTION public.on_group_member_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _teacher uuid; _group_name text; _student_name text;
BEGIN
  SELECT teacher_id, name INTO _teacher, _group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT full_name INTO _student_name FROM public.profiles WHERE id = NEW.student_id;
  IF _teacher IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_teacher, 'student_joined',
      'New student joined ' || COALESCE(_group_name, ''),
      COALESCE(_student_name, 'A student') || ' joined the group.',
      '/groups/' || NEW.group_id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_group_member_insert ON public.group_members;
CREATE TRIGGER trg_notify_group_member_insert AFTER INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.on_group_member_insert();

-- Notify teacher when a student submits an exam
CREATE OR REPLACE FUNCTION public.on_exam_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _teacher uuid; _title text; _student_name text; _group uuid;
BEGIN
  IF NEW.submitted_at IS NULL OR (TG_OP = 'UPDATE' AND OLD.submitted_at IS NOT NULL) THEN RETURN NEW; END IF;
  SELECT e.group_id, e.title, g.teacher_id INTO _group, _title, _teacher
  FROM public.exams e JOIN public.groups g ON g.id = e.group_id WHERE e.id = NEW.exam_id;
  SELECT full_name INTO _student_name FROM public.profiles WHERE id = NEW.student_id;
  IF _teacher IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_teacher, 'exam_submission',
      'Exam submitted: ' || COALESCE(_title, ''),
      COALESCE(_student_name, 'A student') || ' submitted their answers.',
      '/groups/' || _group::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_exam_submission_i ON public.exam_submissions;
CREATE TRIGGER trg_notify_exam_submission_i AFTER INSERT ON public.exam_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_exam_submission();
DROP TRIGGER IF EXISTS trg_notify_exam_submission_u ON public.exam_submissions;
CREATE TRIGGER trg_notify_exam_submission_u AFTER UPDATE OF submitted_at ON public.exam_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_exam_submission();

-- Notify teacher when a student submits an assignment
CREATE OR REPLACE FUNCTION public.on_assignment_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _teacher uuid; _title text; _student_name text; _group uuid;
BEGIN
  SELECT a.group_id, a.title, g.teacher_id INTO _group, _title, _teacher
  FROM public.assignments a JOIN public.groups g ON g.id = a.group_id WHERE a.id = NEW.assignment_id;
  SELECT full_name INTO _student_name FROM public.profiles WHERE id = NEW.student_id;
  IF _teacher IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_teacher, 'assignment_submission',
      'Assignment submitted: ' || COALESCE(_title, ''),
      COALESCE(_student_name, 'A student') || ' submitted their work.',
      '/groups/' || _group::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_assignment_submission ON public.assignment_submissions;
CREATE TRIGGER trg_notify_assignment_submission AFTER INSERT ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_assignment_submission();

-- Notify everyone else in a group when a new chat message is posted
CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _teacher uuid; _sender_name text; _group_name text;
BEGIN
  SELECT teacher_id, name INTO _teacher, _group_name FROM public.groups WHERE id = NEW.group_id;
  SELECT full_name INTO _sender_name FROM public.profiles WHERE id = NEW.sender_id;
  -- notify teacher if not sender
  IF _teacher IS NOT NULL AND _teacher <> NEW.sender_id THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_teacher, 'message',
      'New message in ' || COALESCE(_group_name, ''),
      COALESCE(_sender_name, 'Someone') || ': ' || left(NEW.body, 120),
      '/groups/' || NEW.group_id::text);
  END IF;
  -- notify students in group (except sender)
  INSERT INTO public.notifications(user_id, type, title, body, link)
  SELECT gm.student_id, 'message',
    'New message in ' || COALESCE(_group_name, ''),
    COALESCE(_sender_name, 'Someone') || ': ' || left(NEW.body, 120),
    '/groups/' || NEW.group_id::text
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.student_id <> NEW.sender_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_message_insert ON public.messages;
CREATE TRIGGER trg_notify_message_insert AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();
