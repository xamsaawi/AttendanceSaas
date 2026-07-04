"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSection, deleteSection } from "@/features/classes/actions";
import { sectionSchema, type SectionInput } from "@/lib/validations/classes";

export type SectionRow = {
  id: string;
  name: string;
};

export function SectionsSection({
  sections,
  isAdmin = true,
}: {
  sections: SectionRow[];
  isAdmin?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SectionInput>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: SectionInput) {
    setIsSubmitting(true);
    const result = await createSection(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Section added");
    reset({ name: "" });
  }

  async function onDelete(id: string) {
    const result = await deleteSection(id);
    if (!result.success) toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.id}>
                <TableCell>{section.name}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => onDelete(section.id)}>
                      Delete
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {isAdmin && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-wrap items-end gap-3 border-t pt-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="section-name">Name</Label>
              <Input id="section-name" placeholder="A" {...register("name")} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add section"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
