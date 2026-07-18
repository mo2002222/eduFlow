import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useServerFn } from "@tanstack/react-start";
import { createGroup } from "@/lib/eduflow.functions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/groups/new")({ component: Page });

function Page() {
  const nav = useNavigate();
  const fn = useServerFn(createGroup);
  const { register, handleSubmit } = useForm<any>();
  const m = useMutation({
    mutationFn: (data: any) => fn({ data }),
    onSuccess: (g: any) => { toast.success("Group created"); nav({ to: "/groups/$id", params: { id: g.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Create group</h1>
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-4 rounded-xl border bg-card p-6">
        <div><Label>Name</Label><Input {...register("name", { required: true })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Subject</Label><Input {...register("subject", { required: true })} /></div>
          <div><Label>Grade</Label><Input {...register("grade")} /></div>
        </div>
        <div><Label>Description</Label><Textarea rows={4} {...register("description")} /></div>
        <Button type="submit" disabled={m.isPending} className="w-full">{m.isPending ? "Creating..." : "Create group"}</Button>
      </form>
    </div>
  );
}
