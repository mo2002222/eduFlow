import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getExam, upsertQuestion, deleteQuestion,
  startExam, saveExamProgress, submitExam,
  publishExamResults, gradeExamSubmission,
} from "@/lib/eduflow.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { confirmAction } from "@/components/ui/confirm";
import { Plus, Trash2, Play, Send, Clock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/exams/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const fn = useServerFn(getExam);
  const { data, isLoading } = useQuery({
    queryKey: ["exam", id],
    queryFn: () => fn({ data: { id } }),
  });
  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const { exam, isTeacher } = data;
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link to="/groups/$id" params={{ id: exam.group_id }} className="text-sm text-muted-foreground hover:text-foreground">← Back to group</Link>
      <div className="mt-2 mb-6">
        <span className="text-xs uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">{exam.kind}</span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{exam.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date(exam.start_at).toLocaleString()} → {new Date(exam.end_at).toLocaleString()} · {exam.duration_minutes} min · {exam.total_marks} pts
        </p>
        {exam.description && <p className="mt-3 text-sm rounded-lg border bg-card p-4">{exam.description}</p>}
      </div>
      {isTeacher ? <TeacherView data={data} /> : <StudentView data={data} />}
    </div>
  );
}

// =========================================================
function TeacherView({ data }: any) {
  const qc = useQueryClient();
  const { exam, questions, allSubmissions } = data;
  const upsert = useServerFn(upsertQuestion);
  const del = useServerFn(deleteQuestion);
  const publish = useServerFn(publishExamResults);

  const [draft, setDraft] = useState<any>({
    type: "mcq", prompt: "", options: ["", "", "", ""], correct: 0, marks: 1,
  });

  const addM = useMutation({
    mutationFn: () => upsert({
      data: {
        exam_id: exam.id, ord: questions.length, type: draft.type,
        prompt: draft.prompt,
        options: draft.type === "mcq" ? draft.options.filter(Boolean) : (draft.type === "tf" ? ["True", "False"] : []),
        correct: draft.type === "short" ? null
          : draft.type === "tf" ? draft.correct
          : draft.correct,
        marks: draft.marks,
      },
    }),
    onSuccess: () => {
      toast.success("Question added");
      setDraft({ type: "mcq", prompt: "", options: ["", "", "", ""], correct: 0, marks: 1 });
      qc.invalidateQueries({ queryKey: ["exam", exam.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (qid: string) => del({ data: { id: qid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam", exam.id] }),
  });
  const pubM = useMutation({
    mutationFn: () => publish({ data: { exam_id: exam.id } }),
    onSuccess: () => { toast.success("Results published to students"); qc.invalidateQueries({ queryKey: ["exam", exam.id] }); },
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold mb-3">Questions ({questions.length})</h2>
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions yet. Add the first one below.</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q: any, i: number) => (
              <div key={q.id} className="rounded-lg border bg-card p-3">
                <div className="flex justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-mono text-xs mr-2">Q{i + 1}</span><span className="uppercase text-xs text-primary mr-2">{q.type}</span>{q.prompt}</p>
                    {q.type === "mcq" && (
                      <ul className="mt-1 text-xs text-muted-foreground list-disc pl-5">
                        {q.options.map((o: string, idx: number) => <li key={idx}>{o}{q.correct === idx && " ✓"}</li>)}
                      </ul>
                    )}
                    {q.type === "tf" && <p className="text-xs text-muted-foreground mt-1">Correct: {q.correct === 0 ? "True" : "False"}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => delM.mutate(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Add question</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Type</Label>
            <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v, correct: v === "tf" ? 0 : 0 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple choice</SelectItem>
                <SelectItem value="tf">True / False</SelectItem>
                <SelectItem value="short">Short answer (manual grade)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Marks</Label><Input type="number" value={draft.marks} onChange={(e) => setDraft({ ...draft, marks: +e.target.value })} /></div>
        </div>
        <div><Label>Prompt</Label><Textarea rows={2} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} /></div>
        {draft.type === "mcq" && (
          <div className="space-y-2">
            <Label>Options (pick the correct one)</Label>
            {draft.options.map((opt: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={draft.correct === i} onChange={() => setDraft({ ...draft, correct: i })} />
                <Input value={opt} placeholder={`Option ${i + 1}`} onChange={(e) => {
                  const next = [...draft.options]; next[i] = e.target.value;
                  setDraft({ ...draft, options: next });
                }} />
              </div>
            ))}
          </div>
        )}
        {draft.type === "tf" && (
          <div>
            <Label>Correct answer</Label>
            <Select value={String(draft.correct)} onValueChange={(v) => setDraft({ ...draft, correct: +v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="0">True</SelectItem><SelectItem value="1">False</SelectItem></SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={() => addM.mutate()} disabled={!draft.prompt || addM.isPending}>
          <Plus className="h-4 w-4 mr-1" />Add question
        </Button>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Submissions ({allSubmissions.length})</h2>
          {!exam.published_results && allSubmissions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => pubM.mutate()}>Publish results</Button>
          )}
        </div>
        {allSubmissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {allSubmissions.map((s: any) => (
              <SubmissionRow key={s.id} sub={s} examId={exam.id} questions={questions} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SubmissionRow({ sub, examId, questions }: any) {
  const qc = useQueryClient();
  const grade = useServerFn(gradeExamSubmission);
  const [manual, setManual] = useState<number>(sub.manual_score ?? 0);
  const [feedback, setFeedback] = useState<string>(sub.feedback ?? "");
  const [open, setOpen] = useState(false);
  const m = useMutation({
    mutationFn: () => grade({ data: { submission_id: sub.id, manual_score: manual, feedback } }),
    onSuccess: () => { toast.success("Graded"); qc.invalidateQueries({ queryKey: ["exam", examId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const answers = sub.answers ?? {};
  return (
    <div className="p-3 space-y-3">
      <div className="grid sm:grid-cols-[1fr,auto] gap-3 items-center">
        <div>
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-left">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-sm">{sub.profiles?.full_name || "—"}</span>
          </button>
          <p className="text-xs text-muted-foreground pl-5">{sub.profiles?.email} · status: {sub.status}</p>
          <p className="text-xs pl-5">Auto: {sub.auto_score ?? 0} · Manual: {sub.manual_score ?? 0} · Total: {sub.score ?? "—"}</p>
        </div>
        <div className="flex gap-2 items-end">
          <div><Label className="text-xs">+ manual</Label><Input className="w-20" type="number" value={manual} onChange={(e) => setManual(+e.target.value)} /></div>
          <div><Label className="text-xs">Feedback</Label><Input value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
          <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
        </div>
      </div>
      {open && (
        <div className="ml-5 space-y-2 border-l pl-4">
          {(questions ?? []).map((q: any, i: number) => {
            const a = answers[q.id];
            const answered = a !== undefined && a !== null && a !== "";
            const correct = q.type !== "short" && q.correct !== null && JSON.stringify(a) === JSON.stringify(q.correct);
            const display = (val: any) => {
              if (val === undefined || val === null || val === "") return <em className="text-muted-foreground">No answer</em>;
              if (q.type === "mcq") return q.options?.[val] ?? String(val);
              if (q.type === "tf") return val === 0 ? "True" : "False";
              return String(val);
            };
            return (
              <div key={q.id} className="text-sm">
                <p className="font-medium"><span className="font-mono text-xs mr-2">Q{i + 1}</span>{q.prompt} <span className="text-xs text-muted-foreground">({q.marks} pt)</span></p>
                <p className="text-xs mt-1">
                  <span className="text-muted-foreground">Answer: </span>
                  <span className={q.type === "short" ? "" : (answered ? (correct ? "text-primary font-medium" : "text-destructive font-medium") : "")}>
                    {display(a)}
                  </span>
                  {q.type !== "short" && q.correct !== null && !correct && answered && (
                    <span className="text-muted-foreground"> · Correct: {display(q.correct)}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =========================================================
function StudentView({ data }: any) {
  const { exam, questions, ownSubmission } = data;
  const now = new Date();
  const start = new Date(exam.start_at);
  const end = new Date(exam.end_at);
  const isOpen = now >= start && now <= end;
  const submitted = ownSubmission?.submitted_at;

  if (submitted) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> You submitted this exam</h2>
        <p className="text-sm text-muted-foreground mt-1">Submitted {new Date(submitted).toLocaleString()}</p>
        <p className="mt-3 text-sm">Status: <span className="font-medium">{ownSubmission.status}</span></p>
        {ownSubmission.score !== null && exam.published_results && (
          <p className="mt-1 text-2xl font-bold">{ownSubmission.score} / {exam.total_marks}</p>
        )}
        {ownSubmission.feedback && <p className="mt-2 text-sm italic">"{ownSubmission.feedback}"</p>}
        {!exam.published_results && <p className="mt-3 text-sm text-muted-foreground">Results will appear once your teacher publishes them.</p>}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="mt-2 font-medium">
          {now < start ? "This exam hasn't started yet." : "This exam window has closed."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Window: {start.toLocaleString()} → {end.toLocaleString()}
        </p>
      </div>
    );
  }

  return <ExamRunner exam={exam} questions={questions} existing={ownSubmission} />;
}

function ExamRunner({ exam, questions, existing }: any) {
  const nav = useNavigate();
  const start = useServerFn(startExam);
  const save = useServerFn(saveExamProgress);
  const submit = useServerFn(submitExam);
  const [started, setStarted] = useState(!!existing);
  const [answers, setAnswers] = useState<Record<string, any>>(existing?.answers ?? {});
  const examStart = new Date(exam.start_at);
  const examEnd = new Date(exam.end_at);
  const durationMs = exam.duration_minutes * 60_000;
  // Timer is based on exam clock (start_at + duration), not when student opened it
  const endsAt = new Date(Math.min(examStart.getTime() + durationMs, examEnd.getTime()));
  const [remaining, setRemaining] = useState(Math.max(0, endsAt.getTime() - Date.now()));

  useEffect(() => {
    if (!started) return;
    const i = setInterval(() => setRemaining(Math.max(0, endsAt.getTime() - Date.now())), 1000);
    return () => clearInterval(i);
  }, [started, endsAt]);

  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => { save({ data: { exam_id: exam.id, answers } }).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [answers, started, exam.id, save]);

  useEffect(() => {
    if (started && remaining === 0) {
      submit({ data: { exam_id: exam.id, answers } })
        .then(() => { toast.info("Time up — auto-submitted"); nav({ to: "/groups/$id", params: { id: exam.group_id } }); })
        .catch((e) => toast.error(e.message));
    }
  }, [remaining, started]); // eslint-disable-line

  if (!started) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <h2 className="font-semibold text-lg">Ready to start?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You'll have {exam.duration_minutes} minutes to complete {questions.length} question{questions.length === 1 ? "" : "s"}.
        </p>
        <Button
          className="mt-4"
          onClick={async () => {
            try { await start({ data: { exam_id: exam.id } }); setStarted(true); }
            catch (e: any) { toast.error(e.message); }
          }}
        >
          <Play className="h-4 w-4 mr-1" />Start exam
        </Button>
      </div>
    );
  }

  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);

  async function doSubmit() {
    try {
      await submit({ data: { exam_id: exam.id, answers } });
      toast.success("Submitted!");
      nav({ to: "/groups/$id", params: { id: exam.group_id } });
    } catch (e: any) { toast.error(e.message); }
  }
  function handleSubmit() {
    confirmAction("Submit your answers?", doSubmit, {
      description: "You won't be able to change them afterwards.",
      confirmLabel: "Submit",
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-background/95 backdrop-blur border rounded-lg p-3 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{questions.length} questions</p>
        <p className="font-mono text-lg"><Clock className="inline h-4 w-4 mr-1" />{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</p>
      </div>
      {questions.map((q: any, i: number) => (
        <div key={q.id} className="rounded-xl border bg-card p-4">
          <p className="font-medium"><span className="text-xs font-mono mr-2">Q{i + 1}</span>{q.prompt} <span className="text-xs text-muted-foreground">({q.marks} pt)</span></p>
          <div className="mt-3 space-y-2">
            {q.type === "mcq" && q.options.map((opt: string, idx: number) => (
              <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio" name={q.id}
                  checked={answers[q.id] === idx}
                  onChange={() => setAnswers({ ...answers, [q.id]: idx })}
                />
                {opt}
              </label>
            ))}
            {q.type === "tf" && [["True", 0], ["False", 1]].map(([label, val]) => (
              <label key={label as string} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio" name={q.id}
                  checked={answers[q.id] === val}
                  onChange={() => setAnswers({ ...answers, [q.id]: val })}
                />
                {label}
              </label>
            ))}
            {q.type === "short" && (
              <Textarea
                rows={3}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            )}
          </div>
        </div>
      ))}
      <Button onClick={handleSubmit} className="w-full" size="lg">
        <Send className="h-4 w-4 mr-1" />Submit exam
      </Button>
    </div>
  );
}
