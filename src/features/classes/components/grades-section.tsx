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
import { createGrade, deleteGrade } from "@/features/classes/actions";
import { gradeSchema, type GradeInput } from "@/lib/validations/classes";

export type GradeRow = {
  id: string;
  name: string;
  sort_order: number;
};

export function GradesSection({
  grades,
  isAdmin = true,
}: {
  grades: GradeRow[];
  isAdmin?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GradeInput>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { name: "", sortOrder: grades.length },
  });

  async function onSubmit(data: GradeInput) {
    setIsSubmitting(true);
    const result = await createGrade(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Grade added");
    reset({ name: "", sortOrder: grades.length + 1 });
  }

  async function onDelete(id: string) {
    const result = await deleteGrade(id);
    if (!result.success) toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Order</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.map((grade) => (
              <TableRow key={grade.id}>
                <TableCell>{grade.name}</TableCell>
                <TableCell>{grade.sort_order}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => onDelete(grade.id)}>
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
              <Label htmlFor="grade-name">Name</Label>
              <Input id="grade-name" placeholder="Grade 5" {...register("name")} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade-order">Order</Label>
              <Input id="grade-order" type="number" {...register("sortOrder")} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add grade"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
