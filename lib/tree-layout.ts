import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { PersonDTO, TreeDTO } from "@/lib/types";

export const NODE_WIDTH = 200;
// Must match the person card's actual rendered height (see person-node.tsx) so
// the spouse bar lines up with where child stems begin.
export const NODE_HEIGHT = 72;

export type PersonNodeData = {
  person: PersonDTO;
  isSelf: boolean;
  canAddParent: boolean;
};

export type PersonNode = Node<PersonNodeData, "person">;
export type JunctionNode = Node<Record<string, never>, "junction">;
export type FlowNode = PersonNode | JunctionNode;

/** Tree flow direction: top-to-bottom or left-to-right. */
export type Orientation = "TB" | "LR";

type Pos = { x: number; y: number };

// React Flow places a bottom source handle's connection point a few units
// below the (1px) junction node; subtract it so stems meet the spouse bar.
const JUNCTION_HANDLE_OFFSET = 4;

const unionKey = (ids: string[]) => [...ids].sort().join("+");
const unionNodeId = (key: string) => `u:${key}`;

type Union = { key: string; parentIds: string[]; childIds: string[] };

/** Minimal shape the layout needs — person ids + the relationship edges. */
type LayoutInput = {
  persons: Pick<PersonDTO, "id">[];
  parentChild: { parentId: string; childId: string }[];
  partnerships: { partnerAId: string; partnerBId: string }[];
};

/** Group people into unions keyed by the *set* of co-parents that share children. */
function computeUnions(tree: LayoutInput): Union[] {
  const parentsByChild = new Map<string, string[]>();
  for (const { parentId, childId } of tree.parentChild) {
    const arr = parentsByChild.get(childId) ?? [];
    arr.push(parentId);
    parentsByChild.set(childId, arr);
  }

  const map = new Map<string, Union>();
  for (const [childId, parentIds] of parentsByChild) {
    const key = unionKey(parentIds);
    const u =
      map.get(key) ?? { key, parentIds: [...parentIds].sort(), childIds: [] };
    u.childIds.push(childId);
    map.set(key, u);
  }

  // Childless couples still need to sit adjacent, so register them too.
  for (const pr of tree.partnerships) {
    const key = unionKey([pr.partnerAId, pr.partnerBId]);
    if (!map.has(key)) {
      map.set(key, {
        key,
        parentIds: [pr.partnerAId, pr.partnerBId].sort(),
        childIds: [],
      });
    }
  }

  return [...map.values()];
}

/**
 * Top-to-bottom layout via dagre. Each union becomes a tiny intermediate node
 * (parents -> union -> children) so co-parents land adjacent and their kids
 * share a rank directly beneath them. Returns person top-left positions.
 */
export function computeDagreLayout(
  persons: Pick<PersonDTO, "id">[],
  parentChild: { parentId: string; childId: string }[],
): Map<string, Pos> {
  const { positions } = layoutTree(
    { persons, parentChild, partnerships: [] },
    "TB",
  );
  return positions;
}

/** Core dagre pass shared by the canvas and the seed-position helper. */
function layoutTree(
  tree: LayoutInput,
  orientation: Orientation,
): {
  positions: Map<string, Pos>;
  unions: Union[];
} {
  const unions = computeUnions(tree);

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: orientation,
    nodesep: 40,
    // React Flow centers the sibling-distribution line between a union and its
    // children, so its clearance from the parents is ~ranksep/2. In LR that
    // line is vertical and runs parallel to the parents' right edge, so it
    // needs a wider gap to avoid grazing the cards; in TB it's horizontal and
    // crosses perpendicular, so a tighter rank gap reads cleanly.
    ranksep: orientation === "LR" ? 110 : 44,
    marginx: 60,
    marginy: 60,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const personIds = new Set(tree.persons.map((p) => p.id));
  for (const p of tree.persons) {
    g.setNode(p.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const u of unions) {
    const presentParents = u.parentIds.filter((id) => personIds.has(id));
    const presentChildren = u.childIds.filter((id) => personIds.has(id));
    if (presentParents.length === 0) continue;
    const uid = unionNodeId(u.key);
    g.setNode(uid, { width: 1, height: 1 });
    for (const pid of presentParents) g.setEdge(pid, uid);
    for (const cid of presentChildren) g.setEdge(uid, cid);
  }

  dagre.layout(g);

  const positions = new Map<string, Pos>();
  for (const p of tree.persons) {
    const node = g.node(p.id);
    if (node) {
      positions.set(p.id, {
        x: node.x - NODE_WIDTH / 2,
        y: node.y - NODE_HEIGHT / 2,
      });
    }
  }
  return { positions, unions };
}

/**
 * Reorder siblings within each union so the oldest sits first along the
 * cross-axis (left→right for TB, top→bottom for LR). Dagre fixes the slots;
 * we only swap which child occupies which slot. Twins/unknown dates keep their
 * relative order (stable sort).
 */
function orderSiblingsByAge(
  positions: Map<string, Pos>,
  unions: Union[],
  persons: PersonDTO[],
  orientation: Orientation,
): void {
  const birthById = new Map<string, string | null>();
  for (const p of persons) birthById.set(p.id, p.birthDate);
  const axis = orientation === "TB" ? "x" : "y";

  for (const u of unions) {
    const kids = u.childIds.filter((id) => positions.has(id));
    if (kids.length < 2) continue;

    // The slots dagre assigned, sorted along the cross-axis.
    const slots = kids
      .map((id) => positions.get(id)![axis])
      .sort((a, b) => a - b);

    // Children sorted oldest-first; missing birth dates sink to the end.
    const ordered = [...kids].sort((a, b) => {
      const da = birthById.get(a);
      const db = birthById.get(b);
      if (da === db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    });

    ordered.forEach((id, i) => {
      const pos = positions.get(id)!;
      positions.set(id, { ...pos, [axis]: slots[i] });
    });
  }
}

/** Build React Flow nodes + edges from a tree (always auto-laid-out). */
export function buildFlow(
  tree: TreeDTO,
  orientation: Orientation = "TB",
): { nodes: FlowNode[]; edges: Edge[] } {
  const { positions, unions } = layoutTree(tree, orientation);
  orderSiblingsByAge(positions, unions, tree.persons, orientation);

  const isTB = orientation === "TB";

  const parentCount = new Map<string, number>();
  for (const { childId } of tree.parentChild) {
    parentCount.set(childId, (parentCount.get(childId) ?? 0) + 1);
  }

  const center = (id: string) => {
    const p = positions.get(id);
    return p
      ? { x: p.x + NODE_WIDTH / 2, y: p.y + NODE_HEIGHT / 2 }
      : { x: 0, y: 0 };
  };

  const personNodes: FlowNode[] = tree.persons.map((person) => ({
    id: person.id,
    type: "person",
    position: positions.get(person.id) ?? { x: 0, y: 0 },
    data: {
      person,
      isSelf: tree.selfPersonId === person.id,
      canAddParent: (parentCount.get(person.id) ?? 0) < 2,
    },
  }));

  const edges: Edge[] = [];
  const edgeStyle = { stroke: "var(--border)", strokeWidth: 1.5 };
  const junctionNodes: FlowNode[] = [];

  // Junction per union: children hang from a single branching point.
  for (const u of unions) {
    const parents = u.parentIds.filter((id) => positions.has(id));
    const children = u.childIds.filter((id) => positions.has(id));
    if (parents.length === 0 || children.length === 0) continue;

    const parentCenters = parents.map(center);
    const avg = (sel: (c: Pos) => number) =>
      parentCenters.reduce((s, c) => s + sel(c), 0) / parentCenters.length;

    // The junction sits on the couple's spouse bar (their shared center on the
    // main axis, midpoint on the cross-axis), or on the lone parent's trailing
    // edge. Nudge back by the handle offset so the child stem meets the bar.
    let jx: number;
    let jy: number;
    if (isTB) {
      jx = avg((c) => c.x);
      jy =
        (parents.length >= 2 ? avg((c) => c.y) : parentCenters[0].y + NODE_HEIGHT / 2) -
        JUNCTION_HANDLE_OFFSET;
    } else {
      jx =
        (parents.length >= 2 ? avg((c) => c.x) : parentCenters[0].x + NODE_WIDTH / 2) -
        JUNCTION_HANDLE_OFFSET;
      jy = avg((c) => c.y);
    }

    const jid = unionNodeId(u.key);
    junctionNodes.push({
      id: jid,
      type: "junction",
      position: { x: jx, y: jy },
      data: {},
      draggable: false,
      selectable: false,
    });

    for (const cid of children) {
      edges.push({
        id: `pc:${u.key}:${cid}`,
        source: jid,
        target: cid,
        sourceHandle: isTB ? "out-bottom" : "out-right",
        targetHandle: isTB ? "top" : "left",
        type: "smoothstep",
        style: edgeStyle,
      });
    }
  }

  // Spouse bars: along the cross-axis (horizontal for TB, vertical for LR),
  // drawn leading->trailing so the connector never reverses.
  for (const pair of tree.partnerships) {
    if (!positions.has(pair.partnerAId) || !positions.has(pair.partnerBId)) {
      continue;
    }
    const a = pair.partnerAId;
    const b = pair.partnerBId;
    const aFirst = isTB
      ? center(a).x <= center(b).x
      : center(a).y <= center(b).y;
    const [first, second] = aFirst ? [a, b] : [b, a];
    edges.push({
      id: `sp:${unionKey([a, b])}`,
      source: first,
      target: second,
      sourceHandle: isTB ? "right" : "bottom",
      targetHandle: isTB ? "left" : "top",
      type: "smoothstep",
      data: { spouse: true },
      selectable: false,
      style: edgeStyle,
    });
  }

  return { nodes: [...personNodes, ...junctionNodes], edges };
}

/** Padded bounding box used for React Flow translateExtent (the pan "buffer"). */
export function computeTranslateExtent(
  nodes: { type?: string; position: Pos }[],
  // Generous buffer: small extents make zoom-out clamp against the pan
  // boundary, which reads as the view jerking along 90-degree edges.
  padding = 2500,
): [[number, number], [number, number]] {
  const persons = nodes.filter((n) => n.type !== "junction");
  if (persons.length === 0) {
    return [
      [-padding, -padding],
      [padding, padding],
    ];
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of persons) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, n.position.y + NODE_HEIGHT);
  }
  return [
    [minX - padding, minY - padding],
    [maxX + padding, maxY + padding],
  ];
}
