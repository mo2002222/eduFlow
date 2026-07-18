import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

// ============ Profile / Role ============
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const role = roles?.[0]?.role ?? "student";
    return { profile, role: role as "teacher" | "student", userId };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      full_name: z.string().min(1).max(120),
      phone: z.string().max(40).optional().nullable(),
      grade_level: z.string().max(40).optional().nullable(),
      avatar_url: z.string().url().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Dashboard ============
export const getTeacherDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: groups } = await supabase.from("groups").select("id").eq("teacher_id", userId);
    const groupIds = (groups ?? []).map((g) => g.id);
    const [members, sessions, exams, notifs] = await Promise.all([
      groupIds.length
        ? supabase.from("group_members").select("student_id", { count: "exact", head: true }).in("group_id", groupIds)
        : Promise.resolve({ count: 0 } as any),
      groupIds.length
        ? supabase.from("sessions").select("id", { count: "exact", head: true }).in("group_id", groupIds)
        : Promise.resolve({ count: 0 } as any),
      groupIds.length
        ? supabase.from("exams").select("id,title,start_at,group_id").in("group_id", groupIds).gte("end_at", new Date().toISOString()).order("start_at").limit(5)
        : Promise.resolve({ data: [] } as any),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    ]);
    return {
      totalGroups: groupIds.length,
      totalStudents: (members as any).count ?? 0,
      totalSessions: (sessions as any).count ?? 0,
      upcomingExams: (exams as any).data ?? [],
      notifications: notifs.data ?? [],
    };
  });

export const getStudentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase
      .from("group_members").select("group_id, groups(id,name,subject,grade,image_url)").eq("student_id", userId);
    const groups = (memberships ?? []).map((m: any) => m.groups).filter(Boolean);
    const groupIds = groups.map((g: any) => g.id);
    const [exams, grades, files, notifs] = await Promise.all([
      groupIds.length
        ? supabase.from("exams").select("id,title,start_at,end_at,group_id").in("group_id", groupIds).gte("end_at", new Date().toISOString()).order("start_at").limit(5)
        : Promise.resolve({ data: [] } as any),
      supabase.from("grades").select("*").eq("student_id", userId).order("created_at", { ascending: false }).limit(5),
      groupIds.length
        ? supabase.from("files").select("id,name,created_at,group_id").in("group_id", groupIds).order("created_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: [] } as any),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    ]);
    return {
      groups,
      upcomingExams: (exams as any).data ?? [],
      recentGrades: grades.data ?? [],
      recentFiles: (files as any).data ?? [],
      notifications: notifs.data ?? [],
    };
  });

// ============ Groups ============
export const listGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const role = roleRows?.[0]?.role ?? "student";
    if (role === "teacher") {
      const { data, error } = await supabase.from("groups").select("*").eq("teacher_id", userId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return { role, groups: data ?? [] };
    }
    const { data, error } = await supabase
      .from("group_members").select("groups(*)").eq("student_id", userId);
    if (error) throw new Error(error.message);
    return { role, groups: (data ?? []).map((m: any) => m.groups).filter(Boolean) };
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    name: z.string().min(1).max(120),
    subject: z.string().min(1).max(60),
    grade: z.string().max(40).default(""),
    description: z.string().max(2000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const code = `${data.subject.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4).padEnd(3, "X")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: row, error } = await context.supabase.from("groups").insert({
      ...data, teacher_id: context.userId, join_code: code,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: uuid, name: z.string().min(1), subject: z.string(), grade: z.string(),
    description: z.string().optional().nullable(), image_url: z.string().url().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("groups").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("groups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const joinGroupByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(3).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    // Use admin client to look up the group: RLS hides groups from students
    // until they join, so a normal query would always return "Invalid join code".
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: g, error } = await supabaseAdmin
      .from("groups").select("id,name").eq("join_code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!g) throw new Error("Invalid join code");
    const { data: blocked } = await supabaseAdmin
      .from("group_blocks" as any).select("id")
      .eq("group_id", g.id).eq("student_id", context.userId).maybeSingle();
    if (blocked) throw new Error("You have been blocked from this group by the teacher.");
    const { error: insErr } = await context.supabase
      .from("group_members").insert({ group_id: g.id, student_id: context.userId });
    if (insErr && !/duplicate/i.test(insErr.message)) throw new Error(insErr.message);
    return { groupId: g.id, name: g.name };
  });

// ============ Teacher: manage students ============
export const removeStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ group_id: uuid, student_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("groups").select("teacher_id").eq("id", data.group_id).maybeSingle();
    if (!g || g.teacher_id !== context.userId) throw new Error("Only the group teacher can remove students");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("group_members").delete()
      .eq("group_id", data.group_id).eq("student_id", data.student_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const blockStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ group_id: uuid, student_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("groups").select("teacher_id").eq("id", data.group_id).maybeSingle();
    if (!g || g.teacher_id !== context.userId) throw new Error("Only the group teacher can block students");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("group_members").delete()
      .eq("group_id", data.group_id).eq("student_id", data.student_id);
    const { error } = await supabaseAdmin.from("group_blocks" as any).upsert(
      { group_id: data.group_id, student_id: data.student_id },
      { onConflict: "group_id,student_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unblockStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ group_id: uuid, student_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("groups").select("teacher_id").eq("id", data.group_id).maybeSingle();
    if (!g || g.teacher_id !== context.userId) throw new Error("Only the group teacher can unblock students");
    const { error } = await context.supabase.from("group_blocks" as any).delete()
      .eq("group_id", data.group_id).eq("student_id", data.student_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBlockedStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ group_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("groups").select("teacher_id").eq("id", data.group_id).maybeSingle();
    if (!g || g.teacher_id !== context.userId) throw new Error("Only the teacher can view blocks");
    const { data: rows } = await context.supabase.from("group_blocks" as any)
      .select("student_id, blocked_at").eq("group_id", data.group_id);
    const ids = (rows ?? []).map((r: any) => r.student_id);
    if (!ids.length) return { blocked: [] as any[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs } = await supabaseAdmin.from("profiles").select("id,full_name,email").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      blocked: (rows ?? []).map((r: any) => ({
        student_id: r.student_id,
        blocked_at: r.blocked_at,
        ...(byId.get(r.student_id) ?? {}),
      })),
    };
  });

export const getGroup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: group, error } = await supabase.from("groups").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!group) throw new Error("Group not found");
    const isTeacher = group.teacher_id === userId;
    const [members, sessions, files, assignments, exams] = await Promise.all([
      supabase.from("group_members").select("student_id, joined_at").eq("group_id", data.id),
      supabase.from("sessions").select("*").eq("group_id", data.id).order("number"),
      supabase.from("files").select("*").eq("group_id", data.id).order("created_at", { ascending: false }),
      supabase.from("assignments").select("*").eq("group_id", data.id).order("created_at", { ascending: false }),
      supabase.from("exams").select("*").eq("group_id", data.id).order("start_at", { ascending: false }),
    ]);
    const studentIds = (members.data ?? []).map((m: any) => m.student_id);
    const sessionIds = (sessions.data ?? []).map((s: any) => s.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profilesRes, attRes] = await Promise.all([
      studentIds.length
        ? supabaseAdmin.from("profiles").select("id,full_name,email,avatar_url").in("id", studentIds)
        : Promise.resolve({ data: [] } as any),
      sessionIds.length
        ? supabase.from("attendance_records").select("session_id,student_id,status").in("session_id", sessionIds)
        : Promise.resolve({ data: [] } as any),
    ]);
    const profileById = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const students = (members.data ?? []).map((m: any) => {
      const p: any = profileById.get(m.student_id) ?? {};
      return {
        student_id: m.student_id, joined_at: m.joined_at,
        full_name: p.full_name, email: p.email, avatar_url: p.avatar_url,
      };
    });
    const attendance = attRes.data ?? [];
    const sessionsWithCounts = (sessions.data ?? []).map((s: any) => ({
      ...s,
      attended_count: attendance.filter((a: any) => a.session_id === s.id && a.status === "present").length,
    }));
    return {
      group, isTeacher, students,
      sessions: sessionsWithCounts,
      attendance,
      files: files.data ?? [],
      assignments: assignments.data ?? [],
      exams: exams.data ?? [],
    };
  });

export const leaveGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("group_members").delete()
      .eq("group_id", data.groupId).eq("student_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Sessions ============
export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    group_id: uuid, number: z.coerce.number().int().min(1), title: z.string().min(1),
    description: z.string().optional().nullable(), date: z.string(), start_time: z.string(),
    meeting_url: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("sessions").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: uuid, number: z.coerce.number().int().min(1), title: z.string().min(1),
    description: z.string().optional().nullable(), date: z.string(), start_time: z.string(),
    notes: z.string().optional().nullable(),
    meeting_url: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("sessions").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", data.id).maybeSingle();
    if (error || !session) throw new Error("Session not found");
    const { data: group } = await supabase.from("groups").select("*").eq("id", session.group_id).maybeSingle();
    const isTeacher = group?.teacher_id === userId;
    const [members, attendance, files] = await Promise.all([
      supabase.from("group_members").select("student_id").eq("group_id", session.group_id),
      supabase.from("attendance_records").select("*").eq("session_id", data.id),
      supabase.from("files").select("*").eq("session_id", data.id),
    ]);
    const studentIds = (members.data ?? []).map((m: any) => m.student_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profilesRes = studentIds.length
      ? await supabaseAdmin.from("profiles").select("id,full_name,email,avatar_url").in("id", studentIds)
      : { data: [] as any[] };
    const byId = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    return {
      session, group, isTeacher,
      students: (members.data ?? []).map((m: any) => {
        const p: any = byId.get(m.student_id) ?? {};
        return { student_id: m.student_id, full_name: p.full_name, email: p.email, avatar_url: p.avatar_url };
      }),
      attendance: attendance.data ?? [],
      files: files.data ?? [],
    };
  });

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    session_id: uuid,
    records: z.array(z.object({ student_id: uuid, status: z.enum(["present", "absent"]) })),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const rows = data.records.map((r) => ({ session_id: data.session_id, ...r }));
    const { error } = await context.supabase.from("attendance_records").upsert(rows, { onConflict: "session_id,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Student self-marks present when they open a session (click the lecture link).
export const markSelfPresent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ session_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("attendance_records")
      .upsert({ session_id: data.session_id, student_id: context.userId, status: "present" },
        { onConflict: "session_id,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Files ============
export const createFileRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    group_id: uuid, session_id: uuid.optional().nullable(),
    name: z.string().min(1), path: z.string().min(1), bucket: z.string().default("group-files"),
    mime: z.string().optional().nullable(), size: z.number().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("files").insert({
      ...data, uploader_id: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const uploadGroupFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    group_id: uuid,
    session_id: uuid.optional().nullable(),
    name: z.string().min(1).max(255),
    mime: z.string().max(120).optional().nullable(),
    contentBase64: z.string().min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify teacher owns the group
    const { data: g } = await context.supabase.from("groups")
      .select("id,teacher_id").eq("id", data.group_id).maybeSingle();
    if (!g || g.teacher_id !== context.userId) throw new Error("Only the group teacher can upload files here.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buf = Buffer.from(data.contentBase64, "base64");
    const safe = data.name.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${data.group_id}/${Date.now()}_${safe}`;
    const { error: upErr } = await supabaseAdmin.storage.from("group-files")
      .upload(path, buf, { contentType: data.mime || "application/octet-stream", upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: row, error } = await context.supabase.from("files").insert({
      group_id: data.group_id, session_id: data.session_id ?? null,
      name: data.name, path, bucket: "group-files",
      mime: data.mime, size: buf.length, uploader_id: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: f } = await context.supabase.from("files").select("path,bucket").eq("id", data.id).maybeSingle();
    if (f) await context.supabase.storage.from(f.bucket).remove([f.path]);
    const { error } = await context.supabase.from("files").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSignedFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: f, error } = await context.supabase.from("files").select("path,bucket,name").eq("id", data.id).maybeSingle();
    if (error || !f) throw new Error("File not found");
    const { data: signed, error: sErr } = await context.supabase.storage.from(f.bucket).createSignedUrl(f.path, 60 * 10);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, name: f.name };
  });

// ============ Assignments ============
export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    group_id: uuid, session_id: uuid.optional().nullable(),
    title: z.string().min(1), description: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(), total_marks: z.coerce.number().int().min(1).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("assignments").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: a, error } = await supabase.from("assignments").select("*").eq("id", data.id).maybeSingle();
    if (error || !a) throw new Error("Assignment not found");
    const { data: group } = await supabase.from("groups").select("*").eq("id", a.group_id).maybeSingle();
    const isTeacher = group?.teacher_id === userId;
    const { data: subs } = isTeacher
      ? await supabase.from("assignment_submissions")
          .select("*, profiles:profiles!assignment_submissions_student_id_fkey(full_name,email,avatar_url)")
          .eq("assignment_id", data.id)
      : await supabase.from("assignment_submissions").select("*").eq("assignment_id", data.id).eq("student_id", userId);
    return { assignment: a, isTeacher, submissions: subs ?? [] };
  });

export const submitAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    assignment_id: uuid, content: z.string().max(20000).optional().nullable(),
    files: z.array(z.object({ name: z.string(), path: z.string(), bucket: z.string() })).default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assignment_submissions").upsert({
      assignment_id: data.assignment_id, student_id: context.userId,
      content: data.content, files: data.files, submitted_at: new Date().toISOString(),
    }, { onConflict: "assignment_id,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const gradeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    submission_id: uuid, grade: z.coerce.number(), feedback: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sub, error } = await context.supabase.from("assignment_submissions")
      .update({ grade: data.grade, feedback: data.feedback, graded_at: new Date().toISOString() })
      .eq("id", data.submission_id).select("assignment_id,student_id").single();
    if (error) throw new Error(error.message);
    const { data: a } = await context.supabase.from("assignments").select("group_id,total_marks").eq("id", sub.assignment_id).single();
    if (a) {
      await context.supabase.from("grades").upsert({
        group_id: a.group_id, student_id: sub.student_id, source: "assignment",
        source_id: sub.assignment_id, score: data.grade, max_score: a.total_marks, feedback: data.feedback,
      }, { onConflict: "source,source_id,student_id" });
    }
    return { ok: true };
  });

// ============ Exams ============
export const createExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    group_id: uuid, session_id: uuid.optional().nullable(),
    kind: z.enum(["quiz", "exam"]), title: z.string().min(1),
    description: z.string().optional().nullable(),
    start_at: z.string(), end_at: z.string(),
    duration_minutes: z.coerce.number().int().min(1),
    total_marks: z.coerce.number().int().min(1).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("exams").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("exams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: uuid.optional(), exam_id: uuid, ord: z.coerce.number().int().default(0),
    type: z.enum(["mcq", "tf", "short"]),
    prompt: z.string().min(1),
    options: z.array(z.string()).default([]),
    correct: z.any().optional().nullable(),
    marks: z.coerce.number().int().min(1).default(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data };
    const { data: row, error } = data.id
      ? await context.supabase.from("exam_questions").update(payload).eq("id", data.id).select().single()
      : await context.supabase.from("exam_questions").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("exam_questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getExam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: exam, error } = await supabase.from("exams").select("*").eq("id", data.id).maybeSingle();
    if (error || !exam) throw new Error("Exam not found");
    const { data: group } = await supabase.from("groups").select("*").eq("id", exam.group_id).maybeSingle();
    const isTeacher = group?.teacher_id === userId;
    const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", data.id).order("ord");
    const { data: ownSub } = await supabase.from("exam_submissions").select("*").eq("exam_id", data.id).eq("student_id", userId).maybeSingle();
    let allSubs: any[] = [];
    if (isTeacher) {
      const { data: subs } = await supabase.from("exam_submissions").select("*").eq("exam_id", data.id);
      const ids = Array.from(new Set((subs ?? []).map((s: any) => s.student_id)));
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = ids.length
        ? await supabaseAdmin.from("profiles").select("id,full_name,email,avatar_url").in("id", ids)
        : { data: [] as any[] };
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      allSubs = (subs ?? []).map((s: any) => ({ ...s, profiles: byId.get(s.student_id) ?? {} }));
    }
    const safeQuestions = (questions ?? []).map((q) => {
      if (isTeacher || (exam.published_results && ownSub?.submitted_at)) return q;
      return { ...q, correct: null };
    });
    return { exam, group, isTeacher, questions: safeQuestions, ownSubmission: ownSub, allSubmissions: allSubs };
  });

// ============ Unread badges ============
export const getGroupUnread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reads } = await supabase.from("section_reads")
      .select("section,last_read_at").eq("user_id", userId).eq("group_id", data.groupId);
    const readMap = new Map<string, string>((reads ?? []).map((r: any) => [r.section, r.last_read_at]));
    const epoch = "1970-01-01T00:00:00Z";
    const counts: Record<string, number> = { sessions: 0, files: 0, assignments: 0, exams: 0, messages: 0, students: 0 };
    async function countFor(section: keyof typeof counts) {
      const since = readMap.get(section) ?? epoch;
      const table = section === "students" ? "group_members" : section;
      const timeCol = section === "students" ? "joined_at" : "created_at";
      const { count } = await (context.supabase as any).from(table)
        .select("id", { count: "exact", head: true })
        .eq("group_id", data.groupId).gt(timeCol, since);
      counts[section] = count ?? 0;
    }
    await Promise.all(["sessions","files","assignments","exams","messages","students"].map((s) => countFor(s as any)));
    return counts;
  });

export const markSectionRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: uuid, section: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("section_reads").upsert({
      user_id: context.userId, group_id: data.groupId, section: data.section,
      last_read_at: new Date().toISOString(),
    }, { onConflict: "user_id,group_id,section" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId).is("read_at", null);
    return { count: count ?? 0 };
  });

export const startExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ exam_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: exam } = await context.supabase.from("exams").select("start_at,end_at").eq("id", data.exam_id).single();
    if (!exam) throw new Error("Exam not found");
    const now = new Date();
    if (new Date(exam.start_at) > now) throw new Error("Exam has not started yet");
    if (new Date(exam.end_at) < now) throw new Error("Exam window has closed");
    const { data: existing } = await context.supabase.from("exam_submissions").select("*")
      .eq("exam_id", data.exam_id).eq("student_id", context.userId).maybeSingle();
    if (existing) return existing;
    const { data: row, error } = await context.supabase.from("exam_submissions").insert({
      exam_id: data.exam_id, student_id: context.userId, started_at: new Date().toISOString(), answers: {},
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveExamProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ exam_id: uuid, answers: z.record(z.string(), z.any()) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("exam_submissions")
      .update({ answers: data.answers })
      .eq("exam_id", data.exam_id).eq("student_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ exam_id: uuid, answers: z.record(z.string(), z.any()) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", data.exam_id);
    let auto = 0, manualPending = false;
    for (const q of questions ?? []) {
      const a = data.answers[q.id];
      if (q.type === "mcq" || q.type === "tf") {
        if (a !== undefined && q.correct !== null && JSON.stringify(a) === JSON.stringify(q.correct)) auto += q.marks;
      } else {
        manualPending = true;
      }
    }
    const status = manualPending ? "submitted" : "graded";
    const { error } = await supabase.from("exam_submissions").update({
      answers: data.answers, submitted_at: new Date().toISOString(),
      auto_score: auto, score: manualPending ? null : auto, status,
    }).eq("exam_id", data.exam_id).eq("student_id", userId);
    if (error) throw new Error(error.message);
    if (!manualPending) {
      const { data: e } = await supabase.from("exams").select("group_id,total_marks").eq("id", data.exam_id).single();
      if (e) {
        await supabase.from("grades").upsert({
          group_id: e.group_id, student_id: userId, source: "exam",
          source_id: data.exam_id, score: auto, max_score: e.total_marks,
        }, { onConflict: "source,source_id,student_id" });
      }
    }
    return { ok: true, status, auto };
  });

export const gradeExamSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    submission_id: uuid, manual_score: z.coerce.number(), feedback: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase.from("exam_submissions").select("*").eq("id", data.submission_id).single();
    if (!sub) throw new Error("Submission not found");
    const total = Number(sub.auto_score ?? 0) + data.manual_score;
    const { error } = await context.supabase.from("exam_submissions").update({
      manual_score: data.manual_score, score: total, feedback: data.feedback, status: "graded",
    }).eq("id", data.submission_id);
    if (error) throw new Error(error.message);
    const { data: exam } = await context.supabase.from("exams").select("group_id,total_marks").eq("id", sub.exam_id).single();
    if (exam) {
      await context.supabase.from("grades").upsert({
        group_id: exam.group_id, student_id: sub.student_id, source: "exam",
        source_id: sub.exam_id, score: total, max_score: exam.total_marks, feedback: data.feedback,
      }, { onConflict: "source,source_id,student_id" });
    }
    return { ok: true };
  });

export const publishExamResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ exam_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("exams").update({ published_results: true }).eq("id", data.exam_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Grades ============
export const getGroupGrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: grades, error } = await context.supabase.from("grades")
      .select("*, profiles:profiles!grades_student_id_fkey(full_name,email)")
      .eq("group_id", data.groupId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { grades: grades ?? [] };
  });

// ============ Profile / Attendance Stats ============
export const getStudentProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, attendance, grades, memberships] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("attendance_records").select("status, marked_at, sessions(title,date,group_id,groups(name))").eq("student_id", userId).order("marked_at", { ascending: false }),
      supabase.from("grades").select("*, groups(name)").eq("student_id", userId).order("created_at", { ascending: false }),
      supabase.from("group_members").select("joined_at, groups(id,name,subject)").eq("student_id", userId),
    ]);
    const records = attendance.data ?? [];
    const total = records.length;
    const present = records.filter((r: any) => r.status === "present").length;
    return {
      profile,
      attendancePct: total ? Math.round((present / total) * 100) : 0,
      attendanceRecords: records,
      grades: grades.data ?? [],
      groups: (memberships.data ?? []).map((m: any) => m.groups).filter(Boolean),
    };
  });

// ============ Notifications ============
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("notifications")
      .select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return { notifications: data ?? [] };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notifications")
      .update({ read_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("notifications")
      .update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notifications")
      .delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("notifications")
      .delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Messages (group chat) ============
export const listGroupMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs, error } = await supabase
      .from("messages").select("*").eq("group_id", data.groupId)
      .order("created_at", { ascending: true }).limit(500);
    if (error) throw new Error(error.message);
    const senderIds = Array.from(new Set((msgs ?? []).map((m: any) => m.sender_id)));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = senderIds.length
      ? await supabaseAdmin.from("profiles").select("id,full_name,email,avatar_url").in("id", senderIds)
      : { data: [] as any[] };
    const { data: teacher } = await supabase.from("groups").select("teacher_id").eq("id", data.groupId).maybeSingle();
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return {
      teacherId: teacher?.teacher_id ?? null,
      messages: (msgs ?? []).map((m: any) => {
        const p: any = byId.get(m.sender_id) ?? {};
        return { ...m, sender: { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url } };
      }),
    };
  });

export const sendGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    group_id: uuid, body: z.string().min(1).max(4000),
    parent_id: uuid.optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("messages").insert({
      group_id: data.group_id, sender_id: context.userId,
      body: data.body, parent_id: data.parent_id ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
