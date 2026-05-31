"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { signOut } from "next-auth/react";
import { LogOut, Network, TreePine } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  buildFlow,
  computeTranslateExtent,
  type FlowNode,
  type Orientation,
} from "@/lib/tree-layout";
import type { PersonDTO, TreeDTO } from "@/lib/types";
import type { Relation } from "@/lib/validations";
import { PersonNode } from "./person-node";
import { JunctionNode } from "./junction-node";
import { PersonFormDialog, type DialogState } from "./person-form-dialog";
import { PersonDetailsDialog } from "./person-details-dialog";
import { TreeActionsProvider } from "./tree-context";

const nodeTypes = { person: PersonNode, junction: JunctionNode };

function Canvas({ initialTree }: { initialTree: TreeDTO }) {
  const initial = useMemo(() => buildFlow(initialTree, "TB"), [initialTree]);

  const [tree, setTree] = useState<TreeDTO>(initialTree);
  const [orientation, setOrientation] = useState<Orientation>("TB");
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    initial.nodes,
  );
  const [edges, setEdges] = useEdgesState<Edge>(initial.edges);
  const [extent, setExtent] = useState(() =>
    computeTranslateExtent(initial.nodes),
  );
  const [dialog, setDialog] = useState<DialogState>(null);
  const [details, setDetails] = useState<PersonDTO | null>(null);
  const { fitView } = useReactFlow();

  const applyTree = useCallback(
    (next: TreeDTO, orient: Orientation = orientation) => {
      setTree(next);
      const { nodes: n, edges: e } = buildFlow(next, orient);
      setNodes(n);
      setEdges(e);
      setExtent(computeTranslateExtent(n));
      window.setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 60);
    },
    [fitView, setNodes, setEdges, orientation],
  );

  const toggleOrientation = useCallback(() => {
    const next: Orientation = orientation === "TB" ? "LR" : "TB";
    setOrientation(next);
    applyTree(tree, next);
  }, [orientation, tree, applyTree]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tree");
    if (res.ok) {
      const data = await res.json();
      applyTree(data.tree as TreeDTO);
    }
  }, [applyTree]);

  const onAdd = useCallback((sourcePersonId: string, relation: Relation) => {
    setDetails(null);
    setDialog({ mode: "create", sourcePersonId, relation });
  }, []);

  const onEdit = useCallback<(p: PersonDTO) => void>((person) => {
    setDetails(null);
    setDialog({ mode: "edit", person });
  }, []);

  const onView = useCallback<(p: PersonDTO) => void>(
    (person) => setDetails(person),
    [],
  );

  const actions = useMemo(
    () => ({ onAdd, onEdit, onView }),
    [onAdd, onEdit, onView],
  );

  return (
    <TreeActionsProvider value={actions}>
      <div className="relative h-screen w-screen overflow-hidden bg-surface-2">
        {/* Toolbar */}
        <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-surface/80 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <TreePine className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">{tree.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                orientation === "TB"
                  ? "Switch to horizontal layout"
                  : "Switch to vertical layout"
              }
              title={
                orientation === "TB"
                  ? "Switch to horizontal layout"
                  : "Switch to vertical layout"
              }
              onClick={toggleOrientation}
            >
              <Network
                className={`h-[18px] w-[18px] transition-transform ${
                  orientation === "LR" ? "-rotate-90" : ""
                }`}
              />
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </header>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          translateExtent={extent}
          minZoom={0.3}
          maxZoom={1.8}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesConnectable={false}
          nodesDraggable={false}
          proOptions={{ hideAttribution: true }}
          className="!bg-surface-2"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.5}
            color="var(--canvas-dot)"
          />
          <Controls
            showInteractive={false}
            className="!border-border !bg-surface !shadow-sm"
          />
        </ReactFlow>

        <PersonDetailsDialog
          person={details}
          isSelf={!!details && tree.selfPersonId === details.id}
          onClose={() => setDetails(null)}
          onEdit={onEdit}
        />

        <PersonFormDialog
          state={dialog}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      </div>
    </TreeActionsProvider>
  );
}

export function TreeCanvas({ initialTree }: { initialTree: TreeDTO }) {
  return (
    <ReactFlowProvider>
      <Canvas initialTree={initialTree} />
    </ReactFlowProvider>
  );
}
