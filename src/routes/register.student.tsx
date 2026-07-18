import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { AuthShell } from "./login";

export const Route = createFileRoute("/register/student")({ component: Page });

type F = { full_name: string; email: string; password: string; phone: string; grade_level: string };

function Page() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<F>();
  const onSubmit = async (v: F) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: v.email, password: v.password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: v.full_name, phone: v.phone, grade_level: v.grade_level, role: "student" } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to EduFlow!");
    nav({ to: "/dashboard" });
  };
  return (
    <AuthShell title="Register as Student" subtitle="Join groups, attend sessions and take exams">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div><Label>Full Name</Label><Input {...register("full_name", { required: true })} /></div>
        <div><Label>Email</Label><Input type="email" {...register("email", { required: true })} /></div>
        <div><Label>Phone</Label><Input {...register("phone")} /></div>
        <div><Label>Grade Level</Label><Input placeholder="e.g. Grade 10" {...register("grade_level", { required: true })} /></div>
        <div><Label>Password</Label><Input type="password" {...register("password", { required: true, minLength: 6 })} /></div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating..." : "Create student account"}</Button>
        <p className="text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
