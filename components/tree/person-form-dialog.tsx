"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PersonFields } from "@/components/onboarding/person-fields";
import type { PersonDTO } from "@/lib/types";
import type { PersonInput, Relation } from "@/lib/validations";

export type DialogState =
  | { mode: "create"; sourcePersonId: string; relation: Relation }
  | { mode: "edit"; person: PersonDTO }
  | null;

const RELATION_LABEL: Record<Relation, string> = {
  parent: "Add a parent",
  sibling: "Add a sibling",
  child: "Add a child",
};

function emptyValues(): PersonInput {
  return {
    firstName: "",
    lastName: "",
    sex: "UNKNOWN",
    birthDate: "",
    birthPlace: "",
    deceased: false,
    deathDate: "",
    deathPlace: "",
  };
}

function personToValues(p: PersonDTO): PersonInput {
  return {
    firstName: p.firstName,
    lastName: p.lastName ?? "",
    sex: p.sex,
    birthDate: p.birthDate ? p.birthDate.slice(0, 10) : "",
    birthPlace: p.birthPlace ?? "",
    deceased: p.deceased,
    deathDate: p.deathDate ? p.deathDate.slice(0, 10) : "",
    deathPlace: p.deathPlace ?? "",
  };
}

export function PersonFormDialog({
  state,
  onClose,
  onSaved,
}: {
  state: DialogState;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const methods = useForm<PersonInput>({ defaultValues: emptyValues() });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const open = state !== null;

  useEffect(() => {
    if (!state) return;
    setError(null);
    methods.reset(
      state.mode === "edit" ? personToValues(state.person) : emptyValues(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  const title =
    state.mode === "create" ? RELATION_LABEL[state.relation] : "Edit person";

  async function onSubmit(values: PersonInput) {
    if (!values.firstName?.trim()) {
      setError("First name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let res: Response;
      if (state!.mode === "create") {
        res = await fetch("/api/persons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourcePersonId: state!.sourcePersonId,
            relation: state!.relation,
            person: values,
          }),
        });
      } else {
        res = await fetch(`/api/persons/${state!.person.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save");
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (state!.mode !== "edit") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/persons/${state!.person.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete");
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {state.mode === "create"
              ? "Fill in what you know — you can edit it later."
              : "Update this person's details."}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <PersonFields idPrefix="dlg" />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              {state.mode === "edit" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={onDelete}
                  loading={deleting}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
