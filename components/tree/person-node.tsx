"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Silhouette } from "./silhouette";
import { AddPersonMenu } from "./add-person-menu";
import { useTreeActions } from "./tree-context";
import { useT } from "@/lib/i18n";
import type { PersonNode as PersonNodeType } from "@/lib/tree-layout";
import { fullName } from "@/lib/utils";
import { flexYearLabel } from "@/lib/flex-date";

const handleClass = "!h-2 !w-2 !border-border !bg-surface";

function PersonNodeComponent({ data, selected }: NodeProps<PersonNodeType>) {
  const { person, isSelf, canAddParent } = data;
  const { onView } = useTreeActions();
  const t = useT();
  // Year labels carry a "c." prefix when the date is approximate.
  const b = flexYearLabel(person.birthDate);
  const d = flexYearLabel(person.deathDate);
  const span = person.deceased
    ? `${b || "?"} – ${d || "?"}`
    : b
      ? t("person.bornYear", { year: b })
      : "";

  return (
    <div className="group relative">
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass} />

      <button
        type="button"
        onClick={() => onView(person)}
        style={{ width: 200, height: 72 }}
        className={`flex items-center gap-3 rounded-xl border bg-surface px-3 text-left shadow-sm transition-all hover:shadow-md ${
          selected ? "border-accent ring-2 ring-ring/30" : "border-border"
        }`}
      >
        <Silhouette sex={person.sex} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {fullName(person.firstName, person.lastName) ||
                t("person.unnamed")}
            </p>
            {isSelf && (
              <span className="rounded bg-accent-soft px-1 py-0.5 text-[10px] font-medium text-accent">
                {t("person.you")}
              </span>
            )}
          </div>
          {span && <p className="mt-0.5 text-xs text-muted">{span}</p>}
        </div>
      </button>

      {/* Add-relative button, bottom-center */}
      <div className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 opacity-70 transition-opacity hover:opacity-100 group-hover:opacity-100">
        <AddPersonMenu sourcePersonId={person.id} canAddParent={canAddParent} />
      </div>
    </div>
  );
}

export const PersonNode = memo(PersonNodeComponent);
