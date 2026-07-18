import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({ component: Page });

function Page() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<{ email: string }>();
  const onSubmit = async (v: { email: string }) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox for a reset link");
  };
  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a reset link">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div><Label>Email</Label><Input type="email" {...register("email", { required: true })} /></div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Sending..." : "Send reset link"}</Button>
      </form>
    </AuthShell>
  );
}
