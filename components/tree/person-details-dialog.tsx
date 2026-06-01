"use client";

import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Silhouette } from "./silhouette";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/dictionaries";
import type { PersonDTO } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";

const SEX_KEY: Record<PersonDTO["sex"], DictKey> = {
  MALE: "sex.MALE",
  FEMALE: "sex.FEMALE",
  UNKNOWN: "sex.UNKNOWN",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

export function PersonDetailsDialog({
  person,
  isSelf,
  onClose,
  onEdit,
}: {
  person: PersonDTO | null;
  isSelf: boolean;
  onClose: () => void;
  onEdit: (person: PersonDTO) => void;
}) {
  const t = useT();
  const open = person !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {person && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 pr-6">
                <Silhouette sex={person.sex} />
                <div className="min-w-0">
                  <DialogTitle className="flex items-center gap-2">
                    <span className="truncate">
                      {fullName(person.firstName, person.lastName) ||
                        t("person.unnamed")}
                    </span>
                    {isSelf && (
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        {t("person.you")}
                      </span>
                    )}
                  </DialogTitle>
                  <p className="text-sm text-muted">{t(SEX_KEY[person.sex])}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col">
              <Row
                label={t("field.birthDate")}
                value={formatDate(person.birthDate)}
              />
              <Row
                label={t("field.birthPlace")}
                value={person.birthPlace ?? ""}
              />
              {person.deceased && (
                <>
                  <Row
                    label={t("field.deathDate")}
                    value={formatDate(person.deathDate)}
                  />
                  <Row
                    label={t("field.deathPlace")}
                    value={person.deathPlace ?? ""}
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>
                {t("common.close")}
              </Button>
              <Button onClick={() => onEdit(person)}>
                <Pencil className="h-4 w-4" /> {t("common.edit")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
