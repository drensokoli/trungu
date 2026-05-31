"use client";

import { ArrowUp, ArrowDown, Plus, Users } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTreeActions } from "./tree-context";
import type { Relation } from "@/lib/validations";

const ITEMS: { relation: Relation; label: string; icon: React.ReactNode }[] = [
  { relation: "parent", label: "Add parent", icon: <ArrowUp className="h-4 w-4" /> },
  { relation: "sibling", label: "Add sibling", icon: <Users className="h-4 w-4" /> },
  { relation: "child", label: "Add child", icon: <ArrowDown className="h-4 w-4" /> },
];

export function AddPersonMenu({
  sourcePersonId,
  canAddParent = true,
}: {
  sourcePersonId: string;
  canAddParent?: boolean;
}) {
  const { onAdd } = useTreeActions();
  const [open, setOpen] = useState(false);

  const items = canAddParent
    ? ITEMS
    : ITEMS.filter((item) => item.relation !== "parent");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add relative"
          data-add-trigger={sourcePersonId}
          className="nodrag flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="bottom" className="w-44">
        {items.map((item) => (
          <button
            key={item.relation}
            type="button"
            data-relation={item.relation}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
            onClick={() => {
              setOpen(false);
              onAdd(sourcePersonId, item.relation);
            }}
          >
            <span className="text-muted">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
