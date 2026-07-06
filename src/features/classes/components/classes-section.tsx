"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { createClass, deleteClass, updateClass } from "@/features/classes/actions";
import type { ClassRow } from "@/features/classes/queries";
import { classSchema, type ClassInput } from "@/lib/validations/classes";

type Option = { id: string; name: string };

const NONE_VALUE = "__none__";

export function ClassesSection({
  classes,
  grades,
  sections,
  academicYears,
  teachers,
  isAdmin,
}: {
  classes: ClassRow[];
  grades: Option[];
  sections: Option[];
  academicYears: Option[];
  teachers: Option[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const gradeNameById = new Map(grades.map((g) => [g.id, g.name]));
  const sectionNameById = new Map(sections.map((s) => [s.id, s.name]));
  const yearNameById = new Map(academicYears.map((y) => [y.id, y.name]));
  const teacherNameById = new Map(teachers.map((t) => [t.id, t.name]));

  async function onDelete(id: string) {
    const result = await deleteClass(id);
    if (!result.success) toast.error(result.error);
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: ClassRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Classes</CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <PlusIcon />
            Add class
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Combine a grade, section, and academic year to create a class."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Academic year</TableHead>
                <TableHead>Homeroom teacher</TableHead>
                <TableHead>Capacity</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{gradeNameById.get(row.grade_id) ?? "—"}</TableCell>
                  <TableCell>{sectionNameById.get(row.section_id) ?? "—"}</TableCell>
                  <TableCell>{yearNameById.get(row.academic_year_id) ?? "—"}</TableCell>
                  <TableCell>
                    {row.homeroom_teacher_id
                      ? (teacherNameById.get(row.homeroom_teacher_id) ?? "—")
                      : "—"}
                  </TableCell>
                  <TableCell>{row.capacity ?? "—"}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(row.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {isAdmin && (
        <ClassFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          grades={grades}
          sections={sections}
          academicYears={academicYears}
          teachers={teachers}
        />
      )}
    </Card>
  );
}

function ClassFormDialog({
  open,
  onOpenChange,
  editing,
  grades,
  sections,
  academicYears,
  teachers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ClassRow | null;
  grades: Option[];
  sections: Option[];
  academicYears: Option[];
  teachers: Option[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassInput>({
    resolver: zodResolver(classSchema),
    values: editing
      ? {
          academicYearId: editing.academic_year_id,
          gradeId: editing.grade_id,
          sectionId: editing.section_id,
          homeroomTeacherId: editing.homeroom_teacher_id ?? undefined,
          capacity: editing.capacity ?? undefined,
        }
      : {
          academicYearId: "",
          gradeId: "",
          sectionId: "",
          homeroomTeacherId: undefined,
          capacity: undefined,
        },
  });

  async function onSubmit(data: ClassInput) {
    setIsSubmitting(true);
    const result = editing ? await updateClass(editing.id, data) : await createClass(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Class updated" : "Class added");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit class" : "Add class"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="class-year">Academic year</Label>
            <Controller
              control={control}
              name="academicYearId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="class-year" className="w-full">
                    <SelectValue placeholder="Select year">
                      {(value: string) => academicYears.find((y) => y.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.academicYearId && (
              <p className="text-destructive text-sm">{errors.academicYearId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-grade">Grade</Label>
            <Controller
              control={control}
              name="gradeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="class-grade" className="w-full">
                    <SelectValue placeholder="Select grade">
                      {(value: string) => grades.find((g) => g.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gradeId && <p className="text-destructive text-sm">{errors.gradeId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-section">Section</Label>
            <Controller
              control={control}
              name="sectionId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="class-section" className="w-full">
                    <SelectValue placeholder="Select section">
                      {(value: string) => sections.find((s) => s.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.sectionId && (
              <p className="text-destructive text-sm">{errors.sectionId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-teacher">Homeroom teacher</Label>
            <Controller
              control={control}
              name="homeroomTeacherId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE_VALUE}
                  onValueChange={(value) => field.onChange(value === NONE_VALUE ? undefined : value)}
                >
                  <SelectTrigger id="class-teacher" className="w-full">
                    <SelectValue placeholder="None">
                      {(value: string) =>
                        value === NONE_VALUE ? "None" : (teachers.find((t) => t.id === value)?.name ?? value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-capacity">Capacity</Label>
            <Input id="class-capacity" type="number" {...register("capacity")} />
            {errors.capacity && (
              <p className="text-destructive text-sm">{errors.capacity.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editing ? "Save changes" : "Add class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
