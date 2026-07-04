export type ActionResult = { success: true } | { success: false; error: string };

export type PasswordActionResult =
  | { success: true; tempPassword: string }
  | { success: false; error: string };
