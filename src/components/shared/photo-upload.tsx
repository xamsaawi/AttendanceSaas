"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types/action-result";

export function PhotoUpload({
  currentUrl,
  fallbackText,
  action,
  fieldName = "photo",
}: {
  currentUrl: string | null;
  fallbackText: string;
  action: (formData: FormData) => Promise<ActionResult>;
  fieldName?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    const result = await action(formData);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Photo updated");
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex items-center gap-4">
      <Avatar className="size-12">
        <AvatarImage src={currentUrl ?? undefined} alt="" />
        <AvatarFallback>{fallbackText}</AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldName} className="sr-only">
          Photo
        </Label>
        <Input id={fieldName} name={fieldName} type="file" accept="image/*" className="max-w-64" />
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </form>
  );
}
