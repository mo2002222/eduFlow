import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getGroup, createSession, updateSession, deleteSession,
  uploadGroupFile, deleteFile, getSignedFileUrl,
  createAssignment, deleteAssignment,
  createExam, deleteExam,
  markAttendance, getSession, markSelfPresent,
  listGroupMessages, sendGroupMessage, deleteGroupMessage, getMe,
  getGroupUnread, markSectionRead, deleteGroup,
  removeStudent, blockStudent, unblockStudent, listBlockedStudents,
} from "@/lib/eduflow.functions";
import { useAuth } from "@/lib/auth";
import { confirmAction } from "@/components/ui/confirm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, Calendar, FileText, ClipboardList, GraduationCap, Plus, Trash2,
  Video, Download, ExternalLink, CheckCircle2, XCircle, Pencil,
  MessageCircle, Send, CornerDownRight, UserX, Ban, RotateCcw,
} from "lucide-react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/_authenticated/groups/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(getGroup);
  const delFn = useServerFn(deleteGroup);
  const { session, loading: authLoading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: () => fn({ data: { id } }),
    enabled: !!session?.access_token,
    retry: false,
  });
  const delM = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Group deleted");
      qc.invalidateQueries({ queryKey: ["groups:list"] });
      navigate({ to: "/groups" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading || !session || isLoading || !data) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const g = data.group;
  const isTeacher = data.isTeacher;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link to="/groups" className="text-sm text-muted-foreground hover:text-foreground">← Back to groups</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{g.name}</h1>
            <p className="text-muted-foreground">{g.subject}{g.grade && ` · ${g.grade}`}</p>
          </div>
          {isTeacher && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              disabled={delM.isPending}
              onClick={() => {
                confirmAction(`Delete "${g.name}"?`, () => delM.mutate(), {
                  description: "This removes all sessions, files, assignments, exams and messages. This cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete group
            </Button>
          )}
        </div>
        {isTeacher && (
          <p className="mt-2 text-sm">
            Share this join code with students:{" "}
            <span className="font-mono bg-secondary px-2 py-1 rounded">{g.join_code}</span>
          </p>
        )}
        {g.description && (
          <p className="mt-4 text-sm rounded-lg border bg-card p-4">{g.description}</p>
        )}
      </div>

      <GroupTabs id={id} data={data} isTeacher={isTeacher} />
    </div>
  );
}

function GroupTabs({ id, data, isTeacher }: any) {
  const qc = useQueryClient();
  const fetchUnread = useServerFn(getGroupUnread);
  const markRead = useServerFn(markSectionRead);
  const [tab, setTab] = useState("sessions");
  const { data: unread } = useQuery({
    queryKey: ["group:unread", id],
    queryFn: () => fetchUnread({ data: { groupId: id } }),
    refetchInterval: 15000,
    enabled: !isTeacher,
  });
  const markM = useMutation({
    mutationFn: (section: string) => markRead({ data: { groupId: id, section } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group:unread", id] }),
  });
  function onTabChange(v: string) {
    setTab(v);
    if (!isTeacher && (unread as any)?.[v] > 0) markM.mutate(v);
  }
  const Dot = ({ section }: { section: string }) =>
    !isTeacher && (unread as any)?.[section] > 0
      ? <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500" />
      : null;
  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="sessions"><Calendar className="h-4 w-4 mr-1" />Sessions<Dot section="sessions" /></TabsTrigger>
        <TabsTrigger value="files"><FileText className="h-4 w-4 mr-1" />Files<Dot section="files" /></TabsTrigger>
        <TabsTrigger value="assignments"><ClipboardList className="h-4 w-4 mr-1" />Assignments<Dot section="assignments" /></TabsTrigger>
        <TabsTrigger value="exams"><GraduationCap className="h-4 w-4 mr-1" />Exams<Dot section="exams" /></TabsTrigger>
        <TabsTrigger value="students"><Users className="h-4 w-4 mr-1" />Students<Dot section="students" /></TabsTrigger>
        <TabsTrigger value="messages"><MessageCircle className="h-4 w-4 mr-1" />Messages<Dot section="messages" /></TabsTrigger>
      </TabsList>

      <TabsContent value="sessions" className="mt-6">
        <SessionsTab groupId={id} sessions={data.sessions} students={data.students} isTeacher={isTeacher} />
      </TabsContent>
      <TabsContent value="files" className="mt-6">
        <FilesTab groupId={id} files={data.files} isTeacher={isTeacher} />
      </TabsContent>
      <TabsContent value="assignments" className="mt-6">
        <AssignmentsTab groupId={id} assignments={data.assignments} isTeacher={isTeacher} />
      </TabsContent>
      <TabsContent value="exams" className="mt-6">
        <ExamsTab groupId={id} exams={data.exams} isTeacher={isTeacher} />
      </TabsContent>
      <TabsContent value="students" className="mt-6">
        <StudentsTab groupId={id} students={data.students} sessions={data.sessions} attendance={data.attendance} isTeacher={isTeacher} />
      </TabsContent>
      <TabsContent value="messages" className="mt-6">
        <MessagesTab groupId={id} />
      </TabsContent>
    </Tabs>
  );
}

// ============================ Sessions ============================
function SessionsTab({ groupId, sessions, students, isTeacher }: any) {
  const qc = useQueryClient();
  const create = useServerFn(createSession);
  const del = useServerFn(deleteSession);
  const selfMark = useServerFn(markSelfPresent);

  const createM = useMutation({
    mutationFn: (vals: Record<string, unknown>) => create({ data: { ...vals, group_id: groupId } as any }),
    onSuccess: () => { toast.success("Session created"); qc.invalidateQueries({ queryKey: ["group", groupId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Session deleted"); qc.invalidateQueries({ queryKey: ["group", groupId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function selfMarkAttendance(sessionId: string) {
    if (isTeacher) return;
    try {
      await selfMark({ data: { session_id: sessionId } });
      qc.invalidateQueries({ queryKey: ["group", groupId] });
    } catch (e: any) { console.warn(e); }
  }
  function normalizeUrl(url: string) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  return (
    <div className="space-y-4">
      {isTeacher && (
        <SessionForm
          onSubmit={(v: Record<string, unknown>) => createM.mutate(v)}
          pending={createM.isPending}
          defaultNumber={(sessions?.length ?? 0) + 1}
        />
      )}
      {sessions.length === 0 ? (
        <Empty>No sessions yet.</Empty>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s: any) => (
            <div key={s.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">#{s.number}</span>
                    <h3 className="font-semibold">{s.title}</h3>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      <Users className="h-3 w-3" />
                      {s.attended_count ?? 0} {(s.attended_count ?? 0) === 1 ? "student" : "students"} attended
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.date} · {s.start_time?.slice(0, 5)}
                  </p>
                  {s.description && <p className="mt-2 text-sm">{s.description}</p>}
                  {s.meeting_url && (
                    <a
                      href={normalizeUrl(s.meeting_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        selfMarkAttendance(s.id);
                        const url = normalizeUrl(s.meeting_url);
                        const win = window.open(url, "_blank", "noopener,noreferrer");
                        if (!win) {
                          try { (window.top ?? window).location.href = url; } catch { window.location.href = url; }
                        }
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Video className="h-4 w-4" /> Join lecture <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {isTeacher && (
                  <div className="flex flex-col gap-1">
                    <AttendanceDialog sessionId={s.id} students={students} />
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => confirmAction("Delete this session?", () => deleteM.mutate(s.id), { confirmLabel: "Delete", destructive: true })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionForm({ onSubmit, pending, defaultNumber }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    number: defaultNumber, title: "", description: "",
    date: new Date().toISOString().slice(0, 10),
    start_time: "09:00", meeting_url: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" />New session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create session</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Number</Label><Input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: +e.target.value })} /></div>
            <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
          </div>
          <div>
            <Label>Lecture / meeting link (optional)</Label>
            <Input placeholder="https://meet.google.com/..." value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} />
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !form.title}
            onClick={() => { onSubmit(form); setOpen(false); }}
          >
            {pending ? "Saving..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceDialog({ sessionId, students }: any) {
  const [open, setOpen] = useState(false);
  const getSess = useServerFn(getSession);
  const mark = useServerFn(markAttendance);
  const { data, refetch } = useQuery({
    queryKey: ["session", sessionId, "attendance"],
    queryFn: () => getSess({ data: { id: sessionId } }),
    enabled: open,
  });
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});
  const m = useMutation({
    mutationFn: () => mark({
      data: {
        session_id: sessionId,
        records: students.map((s: any) => ({
          student_id: s.student_id,
          status: marks[s.student_id] ?? "absent",
        })),
      },
    }),
    onSuccess: () => { toast.success("Attendance saved"); refetch(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  // hydrate
  if (data && Object.keys(marks).length === 0 && data.attendance.length) {
    const init: any = {};
    data.attendance.forEach((a: any) => { init[a.student_id] = a.status; });
    if (Object.keys(init).length) setMarks(init);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMarks({}); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><CheckCircle2 className="h-4 w-4 mr-1" />Attendance</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Mark attendance</DialogTitle></DialogHeader>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students in this group yet.</p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto divide-y">
            {students.map((s: any) => (
              <div key={s.student_id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={marks[s.student_id] === "present" ? "default" : "outline"}
                    onClick={() => setMarks({ ...marks, [s.student_id]: "present" })}
                  ><CheckCircle2 className="h-4 w-4" /></Button>
                  <Button
                    size="sm"
                    variant={marks[s.student_id] === "absent" ? "destructive" : "outline"}
                    onClick={() => setMarks({ ...marks, [s.student_id]: "absent" })}
                  ><XCircle className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || students.length === 0}>
            {m.isPending ? "Saving..." : "Save attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ Files ============================
function FilesTab({ groupId, files, isTeacher }: any) {
  const qc = useQueryClient();
  const upload = useServerFn(uploadGroupFile);
  const del = useServerFn(deleteFile);
  const sign = useServerFn(getSignedFileUrl);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
      await upload({ data: { group_id: groupId, name: file.name, mime: file.type, contentBase64: b64 } });
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: ["group", groupId] });
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function download(id: string) {
    try {
      const r = await sign({ data: { id } });
      window.open(r.url, "_blank");
    } catch (e: any) { toast.error(e.message); }
  }

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["group", groupId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {isTeacher && (
        <label className="rounded-xl border-2 border-dashed bg-card hover:border-primary/50 transition-colors p-6 flex flex-col items-center justify-center cursor-pointer">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">{uploading ? "Uploading…" : "Click to upload a file"}</p>
          <p className="text-xs text-muted-foreground">Materials, slides, PDFs — any file students should access</p>
          <input
            type="file" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
          />
        </label>
      )}
      {files.length === 0 ? <Empty>No files yet.</Empty> : (
        <div className="grid gap-2">
          {files.map((f: any) => (
            <div key={f.id} className="rounded-lg border bg-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {new Date(f.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => download(f.id)}><Download className="h-4 w-4" /></Button>
                {isTeacher && (
                  <Button variant="ghost" size="sm" onClick={() => confirmAction("Delete this file?", () => delM.mutate(f.id), { confirmLabel: "Delete", destructive: true })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================ Assignments ============================
function AssignmentsTab({ groupId, assignments, isTeacher }: any) {
  const qc = useQueryClient();
  const create = useServerFn(createAssignment);
  const del = useServerFn(deleteAssignment);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", total_marks: 100 });

  const createM = useMutation({
    mutationFn: () => create({ data: { ...form, group_id: groupId, due_date: form.due_date || null } }),
    onSuccess: () => { toast.success("Assignment created"); setOpen(false); setForm({ title: "", description: "", due_date: "", total_marks: 100 }); qc.invalidateQueries({ queryKey: ["group", groupId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["group", groupId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {isTeacher && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New assignment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Due date</Label><Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                <div><Label>Total marks</Label><Input type="number" value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: +e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createM.mutate()} disabled={!form.title || createM.isPending}>{createM.isPending ? "Saving..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {assignments.length === 0 ? <Empty>No assignments yet.</Empty> : (
        <div className="grid gap-2">
          {assignments.map((a: any) => (
            <div key={a.id} className="rounded-lg border bg-card p-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-xs text-muted-foreground">Due {a.due_date ? new Date(a.due_date).toLocaleString() : "—"} · {a.total_marks} marks</p>
                {a.description && <p className="text-sm mt-1">{a.description}</p>}
              </div>
              {isTeacher && (
                <Button variant="ghost" size="sm" onClick={() => confirmAction("Delete this assignment?", () => delM.mutate(a.id), { confirmLabel: "Delete", destructive: true })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================ Exams ============================
function ExamsTab({ groupId, exams, isTeacher }: any) {
  const qc = useQueryClient();
  const create = useServerFn(createExam);
  const del = useServerFn(deleteExam);
  const [open, setOpen] = useState(false);
  const now = new Date(); const inHour = new Date(Date.now() + 3600_000);
  const [form, setForm] = useState({
    title: "", description: "", kind: "exam" as "exam" | "quiz",
    start_at: now.toISOString().slice(0, 16),
    end_at: inHour.toISOString().slice(0, 16),
    duration_minutes: 60, total_marks: 100,
  });

  const createM = useMutation({
    mutationFn: () => create({
      data: {
        ...form, group_id: groupId,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
      },
    }),
    onSuccess: () => {
      toast.success("Exam created — add questions next"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      qc.invalidateQueries({ queryKey: ["dash:teacher"] });
      qc.invalidateQueries({ queryKey: ["dash:student"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["group", groupId] });
      qc.invalidateQueries({ queryKey: ["dash:teacher"] });
      qc.invalidateQueries({ queryKey: ["dash:student"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {isTeacher && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New exam / quiz</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create exam</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Kind</Label>
                  <Select value={form.kind} onValueChange={(v: any) => setForm({ ...form, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="exam">Exam</SelectItem><SelectItem value="quiz">Quiz</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
                <div><Label>End</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
              </div>
              <div><Label>Total marks</Label><Input type="number" value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: +e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => createM.mutate()} disabled={!form.title || createM.isPending}>{createM.isPending ? "Saving..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {exams.length === 0 ? <Empty>No exams yet.</Empty> : (
        <div className="grid gap-2">
          {exams.map((e: any) => (
            <div key={e.id} className="rounded-lg border bg-card p-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">{e.kind}</span>
                  <h3 className="font-semibold">{e.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(e.start_at).toLocaleString()} → {new Date(e.end_at).toLocaleString()} · {e.duration_minutes} min · {e.total_marks} pts
                </p>
                {e.description && <p className="text-sm mt-1">{e.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link to="/exams/$id" params={{ id: e.id }}>{isTeacher ? <><Pencil className="h-4 w-4 mr-1" />Manage</> : "Open"}</Link>
                </Button>
                {isTeacher && (
                  <Button variant="ghost" size="sm" onClick={() => confirmAction("Delete this exam?", () => delM.mutate(e.id), { confirmLabel: "Delete", destructive: true })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================ Students ============================
function StudentsTab({ groupId, students, sessions, attendance, isTeacher }: any) {
  const qc = useQueryClient();
  const removeFn = useServerFn(removeStudent);
  const blockFn = useServerFn(blockStudent);
  const unblockFn = useServerFn(unblockStudent);
  const listBlockedFn = useServerFn(listBlockedStudents);
  const { data: blockedData } = useQuery({
    queryKey: ["group:blocked", groupId],
    queryFn: () => listBlockedFn({ data: { group_id: groupId } }),
    enabled: !!isTeacher,
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["group", groupId] });
    qc.invalidateQueries({ queryKey: ["group:blocked", groupId] });
  };
  const removeM = useMutation({
    mutationFn: (sid: string) => removeFn({ data: { group_id: groupId, student_id: sid } }),
    onSuccess: () => { toast.success("Student removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const blockM = useMutation({
    mutationFn: (sid: string) => blockFn({ data: { group_id: groupId, student_id: sid } }),
    onSuccess: () => { toast.success("Student blocked"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const unblockM = useMutation({
    mutationFn: (sid: string) => unblockFn({ data: { group_id: groupId, student_id: sid } }),
    onSuccess: () => { toast.success("Student unblocked"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const attMap = new Map<string, "present" | "absent">();
  (attendance ?? []).forEach((a: any) => attMap.set(`${a.session_id}:${a.student_id}`, a.status));

  function StudentActions({ st }: { st: any }) {
    return (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" title="Remove from group"
          onClick={() => confirmAction(
            `Remove ${st.full_name || "this student"} from the group?`,
            () => removeM.mutate(st.student_id),
            { description: "They can re-join using the join code.", confirmLabel: "Remove", destructive: true },
          )}>
          <UserX className="h-4 w-4 text-destructive" />
        </Button>
        <Button size="sm" variant="ghost" title="Block from group"
          onClick={() => confirmAction(
            `Block ${st.full_name || "this student"}?`,
            () => blockM.mutate(st.student_id),
            { description: "They will be removed and won't be able to join again.", confirmLabel: "Block", destructive: true },
          )}>
          <Ban className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  const blockedList = (blockedData as any)?.blocked ?? [];

  const rosterEmpty = students.length === 0;

  return (
    <div className="space-y-6">
      {rosterEmpty ? (
        <Empty>No students have joined yet.</Empty>
      ) : (!isTeacher || !sessions || sessions.length === 0) ? (
        <div className="rounded-xl border bg-card divide-y">
          {students.map((s: any) => (
            <div key={s.student_id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{s.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{new Date(s.joined_at).toLocaleDateString()}</span>
                {isTeacher && <StudentActions st={s} />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Per-student attendance across the last 20 sessions. Use the icons on the right to remove or block a student.
          </p>
          {(() => {
          const displaySessions = [...sessions]
            .sort((a: any, b: any) => (b.number ?? 0) - (a.number ?? 0))
            .slice(0, 20)
            .reverse();
          return (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 sticky left-0 bg-muted/40 z-10">Student</th>
                  {displaySessions.map((s: any) => (
                    <th key={s.id} className="p-2 text-center font-medium" title={s.title}>
                      <div className="text-xs">#{s.number}</div>
                    </th>
                  ))}
                  <th className="p-3 text-center">Attended</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((st: any) => {
                  const attended = displaySessions.filter(
                    (s: any) => attMap.get(`${s.id}:${st.student_id}`) === "present",
                  ).length;
                  return (
                    <tr key={st.student_id}>
                      <td className="p-3 sticky left-0 bg-card z-10">
                        <p className="font-medium">{st.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{st.email}</p>
                      </td>
                      {displaySessions.map((s: any) => {
                        const v = attMap.get(`${s.id}:${st.student_id}`);
                        return (
                          <td key={s.id} className="p-2 text-center">
                            {v === "present" ? (
                              <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                            ) : v === "absent" ? (
                              <XCircle className="h-4 w-4 text-destructive mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-medium">
                        {attended}/{displaySessions.length}
                      </td>
                      <td className="p-3"><StudentActions st={st} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          );
          })()}
        </div>
      )}

      {isTeacher && blockedList.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Ban className="h-4 w-4 text-destructive" /> Blocked students ({blockedList.length})</h3>
          <div className="rounded-xl border bg-card divide-y">
            {blockedList.map((b: any) => (
              <div key={b.student_id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{b.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.email} · blocked {new Date(b.blocked_at).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="outline"
                  onClick={() => confirmAction(
                    `Unblock ${b.full_name || "this student"}?`,
                    () => unblockM.mutate(b.student_id),
                    { description: "They will be able to join the group again with the code.", confirmLabel: "Unblock" },
                  )}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Unblock
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ children }: any) {
  return <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">{children}</div>;
}

// ============================ Messages ============================
function MessagesTab({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listGroupMessages);
  const sendFn = useServerFn(sendGroupMessage);
  const delFn = useServerFn(deleteGroupMessage);
  const meFn = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data, isLoading } = useQuery({
    queryKey: ["messages", groupId],
    queryFn: () => listFn({ data: { groupId } }),
    refetchInterval: 5000,
  });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendM = useMutation({
    mutationFn: () => sendFn({ data: { group_id: groupId, body, parent_id: replyTo?.id ?? null } }),
    onSuccess: () => { setBody(""); setReplyTo(null); qc.invalidateQueries({ queryKey: ["messages", groupId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", groupId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data?.messages.length]);

  const myId = me?.userId;
  const teacherId = data?.teacherId;
  const msgs = data?.messages ?? [];
  const byId = new Map(msgs.map((m: any) => [m.id, m]));

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[70vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : msgs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No messages yet — start the conversation.</p>
        ) : msgs.map((m: any) => {
          const mine = m.sender_id === myId;
          const isTeacherMsg = m.sender_id === teacherId;
          const canDelete = mine || myId === teacherId;
          const parent: any = m.parent_id ? byId.get(m.parent_id) : null;
          const initials = (m.sender.full_name || m.sender.email || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                  <span className="font-medium text-foreground">{m.sender.full_name || m.sender.email}</span>
                  {isTeacherMsg && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">Teacher</span>}
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                </div>
                {parent && (
                  <div className="text-xs border-l-2 border-primary/40 pl-2 mb-1 text-muted-foreground italic max-w-full truncate">
                    <CornerDownRight className="h-3 w-3 inline mr-1" />
                    {parent.sender?.full_name || "—"}: {String(parent.body).slice(0, 80)}
                  </div>
                )}
                <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body}
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setReplyTo({ id: m.id, preview: m.body })}
                  >Reply</button>
                  {canDelete && (
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() => confirmAction("Delete this message?", () => delM.mutate(m.id), { confirmLabel: "Delete", destructive: true })}
                    >Delete</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {replyTo && (
        <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/40 text-xs">
          <span className="truncate"><CornerDownRight className="h-3 w-3 inline mr-1" />Replying: {replyTo.preview.slice(0, 80)}</span>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setReplyTo(null)}>Cancel</button>
        </div>
      )}
      <form
        className="border-t p-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (body.trim()) sendM.mutate(); }}
      >
        <Input
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={sendM.isPending}
        />
        <Button type="submit" disabled={!body.trim() || sendM.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
