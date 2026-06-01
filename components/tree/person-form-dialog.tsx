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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PersonFields } from "@/components/onboarding/person-fields";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/dictionaries";
import type { PersonDTO } from "@/lib/types";
import type { PersonInput, Relation } from "@/lib/validations";

export type DialogState =
  | { mode: "create"; sourcePersonId: string; relation: Relation }
  | { mode: "edit"; person: PersonDTO }
  | null;

const RELATION_TITLE: Record<Relation, DictKey> = {
  parent: "form.title.parent",
  sibling: "form.title.sibling",
  child: "form.title.child",
  spouse: "form.title.spouse",
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
    birthDate: p.birthDate ?? "",
    birthPlace: p.birthPlace ?? "",
    deceased: p.deceased,
    deathDate: p.deathDate ?? "",
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
  const t = useT();
  const methods = useForm<PersonInput>({ defaultValues: emptyValues() });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [current, setCurrent] = useState(true);

  const open = state !== null;

  useEffect(() => {
    if (!state) return;
    setError(null);
    setCurrent(true);
    methods.reset(
      state.mode === "edit" ? personToValues(state.person) : emptyValues(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  const isSpouse = state.mode === "create" && state.relation === "spouse";
  const title =
    state.mode === "create"
      ? t(RELATION_TITLE[state.relation])
      : t("form.title.edit");

  async function onSubmit(values: PersonInput) {
    if (!values.firstName?.trim()) {
      setError(t("form.firstNameRequired"));
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
            current,
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
        setError(data.error ?? t("form.saveFailed"));
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
        setError(data.error ?? t("form.deleteFailed"));
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
              ? t("form.desc.create")
              : t("form.desc.edit")}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <PersonFields idPrefix="dlg" />

            {isSpouse && (
              <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
                <Label htmlFor="dlg-current">{t("form.currentPartner")}</Label>
                <Switch
                  id="dlg-current"
                  checked={current}
                  onCheckedChange={setCurrent}
                />
              </div>
            )}

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
                  <Trash2 className="h-4 w-4" /> {t("common.delete")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={saving}>
                  {t("common.save")}
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
