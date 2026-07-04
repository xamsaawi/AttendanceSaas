"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  type ForgotPasswordInput,
  type LoginInput,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types/action-result";

export type { ActionResult };

export async function login(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logger.warn("Login failed", { email: parsed.data.email, message: error.message });
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);

  if (error) {
    logger.warn("Password reset request failed", {
      email: parsed.data.email,
      message: error.message,
    });
    return { success: false, error: error.message };
  }

  return { success: true };
}
