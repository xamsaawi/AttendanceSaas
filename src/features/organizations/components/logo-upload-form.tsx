"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadSchoolLogo } from "@/features/organizations/actions";

export function LogoUploadForm({ logoUrl }: { logoUrl: string | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    const result = await uploadSchoolLogo(formData);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Logo updated");
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex items-center gap-4">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
        <img
          src={logoUrl}
          alt="School logo"
          width={48}
          height={48}
          className="size-12 rounded-md object-cover ring-1 ring-foreground/10"
        />
      )}
      <div className="flex items-center gap-2">
        <Label htmlFor="logo" className="sr-only">
          Logo
        </Label>
        <Input id="logo" name="logo" type="file" accept="image/*" className="max-w-64" />
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </form>
  );
}
