"use client";

import { createContext, useContext } from "react";
import type { PersonDTO } from "@/lib/types";
import type { Relation } from "@/lib/validations";

export type TreeActions = {
  onAdd: (sourcePersonId: string, relation: Relation) => void;
  onEdit: (person: PersonDTO) => void;
  onView: (person: PersonDTO) => void;
};

const TreeActionsContext = createContext<TreeActions | null>(null);

export const TreeActionsProvider = TreeActionsContext.Provider;

export function useTreeActions(): TreeActions {
  const ctx = useContext(TreeActionsContext);
  if (!ctx) throw new Error("useTreeActions must be used within TreeActionsProvider");
  return ctx;
}
