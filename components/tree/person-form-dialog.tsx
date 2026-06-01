"use client";

import { useEffect, useMemo, useState } from "react";
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
import { fullName } from "@/lib/utils";
import type { DictKey } from "@/lib/dictionaries";
import type { PersonDTO, TreeDTO } from "@/lib/types";
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

/**
 * When a parent has 2+ spouses, the child form must say which spouse co-parents
 * the child. This resolves that context: the "spine" parent, their spouses, and
 * the value to preselect — for both adding a child and editing an existing one.
 */
type ParentChoice = {
  spineId: string;
  spouses: { id: string; name: string }[];
  defaultValue: string;
};

export function PersonFormDialog({
  state,
  tree,
  onClose,
  onSaved,
}: {
  state: DialogState;
  tree: TreeDTO;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useT();
  const methods = useForm<PersonInput>({ defaultValues: emptyValues() });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [current, setCurrent] = useState(true);
  const [otherParentId, setOtherParentId] = useState("");

  const open = state !== null;

  // Spouse-choice context, only when a relevant parent is polygamous.
  const parentChoice = useMemo<ParentChoice | null>(() => {
    if (!state) return null;
    const partnersOf = (pid: string) => {
      const out: string[] = [];
      for (const pr of tree.partnerships) {
        if (pr.partnerAId === pid) out.push(pr.partnerBId);
        else if (pr.partnerBId === pid) out.push(pr.partnerAId);
      }
      return [...new Set(out)];
    };
    const named = (ids: string[]) =>
      ids.map((id) => {
        const p = tree.persons.find((x) => x.id === id);
        return {
          id,
          name: p ? fullName(p.firstName, p.lastName) || t("person.unnamed") : id,
        };
      });

    if (state.mode === "create" && state.relation === "child") {
      const spouses = partnersOf(state.sourcePersonId);
      if (spouses.length < 2) return null;
      // Default to the primary (earliest-added) spouse.
      return { spineId: state.sourcePersonId, spouses: named(spouses), defaultValue: spouses[0] };
    }
    if (state.mode === "edit") {
      const childId = state.person.id;
      const parentIds = tree.parentChild
        .filter((l) => l.childId === childId)
        .map((l) => l.parentId);
      const spineId = parentIds.find((p) => partnersOf(p).length >= 2);
      if (!spineId) return null;
      const currentOther = parentIds.find((p) => p !== spineId) ?? "";
      return { spineId, spouses: named(partnersOf(spineId)), defaultValue: currentOther };
    }
    return null;
  }, [state, tree, t]);

  useEffect(() => {
    if (!state) return;
    setError(null);
    setCurrent(true);
    setOtherParentId(parentChoice?.defaultValue ?? "");
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
            // Only send when the parent has multiple spouses to choose from.
            ...(parentChoice && state!.relation === "child"
              ? { otherParentId }
              : {}),
          }),
        });
      } else {
        res = await fetch(`/api/persons/${state!.person.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            // Reassign parents only when a spouse choice is offered.
            ...(parentChoice
              ? {
                  parents: otherParentId
                    ? [parentChoice.spineId, otherParentId]
                    : [parentChoice.spineId],
                }
              : {}),
          }),
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

            {parentChoice && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dlg-otherParent">{t("form.otherParent")}</Label>
                <select
                  id="dlg-otherParent"
                  value={otherParentId}
                  onChange={(e) => setOtherParentId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {parentChoice.spouses.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                  <option value="">{t("form.parentUnknown")}</option>
                </select>
                <p className="text-xs text-muted">{t("form.otherParentHint")}</p>
              </div>
            )}

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
