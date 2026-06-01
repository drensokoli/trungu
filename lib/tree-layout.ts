import type { Edge, Node } from "@xyflow/react";
import type { PersonDTO, TreeDTO } from "@/lib/types";
import { flexSortKey } from "@/lib/flex-date";

export const NODE_WIDTH = 200;
// Must match the person card's actual rendered height (see person-node.tsx) so
// the spouse bar lines up with where child stems begin.
export const NODE_HEIGHT = 72;
// Gap between the two cards of a couple. A couple is laid out as ONE dagre node
// spanning both cards + this gap, so spouses can never drift apart.
export const SPOUSE_GAP = 48;

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

// Junction handles are pinned to the node's exact center (see junction-node.tsx),
// so a junction's connection point coincides with its position — no handle-offset
// compensation is needed and child stems meet the spouse bar exactly.
const JUNCTION_HANDLE_OFFSET = 0;

const unionKey = (ids: string[]) => [...ids].sort().join("+");
const unionNodeId = (key: string) => `u:${key}`;

type Union = { key: string; parentIds: string[]; childIds: string[] };

/** Minimal shape the layout needs — person ids (+ optional birthDate) + edges. */
type LayoutInput = {
  persons: (Pick<PersonDTO, "id"> & { birthDate?: string | null })[];
  parentChild: { parentId: string; childId: string }[];
  partnerships: { partnerAId: string; partnerBId: string; current?: boolean }[];
};

/** A layout unit: a married/co-parenting pair (2 members) or a lone person (1). */
type Couple = { id: string; memberIds: string[] };

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
 * Group people into couples so the layout can treat each couple as ONE node.
 * A couple = two people who are partners, or the two co-parents of a 2-parent
 * union. Each person joins at most one couple (first pairing wins); anyone left
 * over — singles, lone parents, or the "extra" spouse in a remarriage — becomes
 * a one-member group. Returns the groups plus a person -> group-id lookup.
 */
function computeCouples(tree: LayoutInput): {
  groups: Couple[];
  groupOf: Map<string, string>;
} {
  const ids = tree.persons.map((p) => p.id);
  const idSet = new Set(ids);

  // Candidate pairs: explicit partnerships first (they win ties), then the
  // co-parent pairs implied by any union with exactly two parents.
  const pairs: [string, string][] = [];
  // Current partners win the adjacency (`mate`) below, so a person sits next to
  // their current spouse even if a former one was recorded first.
  const orderedPartnerships = [...tree.partnerships].sort(
    (a, b) => Number(b.current ?? true) - Number(a.current ?? true),
  );
  for (const pr of orderedPartnerships) {
    if (idSet.has(pr.partnerAId) && idSet.has(pr.partnerBId)) {
      pairs.push([pr.partnerAId, pr.partnerBId]);
    }
  }
  for (const u of computeUnions(tree)) {
    const present = u.parentIds.filter((id) => idSet.has(id));
    if (present.length === 2) pairs.push([present[0], present[1]]);
  }

  const mate = new Map<string, string>();
  for (const [a, b] of pairs) {
    if (a === b) continue;
    if (!mate.has(a) && !mate.has(b)) {
      mate.set(a, b);
      mate.set(b, a);
    }
  }

  const groups: Couple[] = [];
  const groupOf = new Map<string, string>();
  const done = new Set<string>();
  for (const id of ids) {
    if (done.has(id)) continue;
    const m = mate.get(id);
    const members = m !== undefined && !done.has(m) ? [id, m] : [id];
    const gid = `g:${[...members].sort().join("+")}`;
    for (const mem of members) {
      done.add(mem);
      groupOf.set(mem, gid);
    }
    groups.push({ id: gid, memberIds: members });
  }
  return { groups, groupOf };
}

/**
 * Compare two flexible-date birth tokens, oldest first; null/unknown sinks to
 * the end. Tokens compare lexically (a year-only "1990" precedes "1990-05"),
 * which matches chronological order; the approximate "~" marker is stripped.
 */
function compareBirth(a: string | null, b: string | null): number {
  const ka = flexSortKey(a);
  const kb = flexSortKey(b);
  if (ka === kb) return 0;
  if (!ka) return 1;
  if (!kb) return -1;
  return ka < kb ? -1 : 1;
}

/**
 * A "marriage group" of a spine person: one spouse plus the children they
 * share. Children recorded with the spine as their ONLY parent are folded into
 * the primary (first) marriage. Groups are ordered by their oldest child's age,
 * so spouses sort by their children's ages; childless marriages sink to the end.
 */
export type MarriageGroup = { spouseId: string | null; childIds: string[] };

/**
 * Map every parent/partner to their ordered marriage groups. Shared by the
 * layout (positions) and buildFlow (junction depths) so both order a person's
 * marriages — and therefore stagger their child connectors — identically.
 */
export function computeMarriages(
  tree: LayoutInput,
): Map<string, MarriageGroup[]> {
  const birthById = new Map<string, string | null>();
  for (const p of tree.persons) birthById.set(p.id, p.birthDate ?? null);
  const cmp = (a: string, b: string) =>
    compareBirth(birthById.get(a) ?? null, birthById.get(b) ?? null);
  const oldest = (ids: string[]) =>
    ids.length ? birthById.get(ids[0]) ?? null : null;

  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();
  const partnersOf = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) => {
    const a = m.get(k);
    if (a) a.push(v);
    else m.set(k, [v]);
  };
  for (const { parentId, childId } of tree.parentChild) {
    push(parentsByChild, childId, parentId);
    push(childrenByParent, parentId, childId);
  }
  for (const pr of tree.partnerships) {
    push(partnersOf, pr.partnerAId, pr.partnerBId);
    push(partnersOf, pr.partnerBId, pr.partnerAId);
  }

  const result = new Map<string, MarriageGroup[]>();
  const spines = new Set<string>([
    ...partnersOf.keys(),
    ...childrenByParent.keys(),
  ]);
  for (const spine of spines) {
    const spouseIds = [...new Set(partnersOf.get(spine) ?? [])];
    const kids = [...new Set(childrenByParent.get(spine) ?? [])];
    const bySpouse = new Map<string, string[]>();
    const singles: string[] = [];
    for (const c of kids) {
      const other = (parentsByChild.get(c) ?? []).find((p) => p !== spine);
      if (other && spouseIds.includes(other)) push(bySpouse, other, c);
      else singles.push(c);
    }
    const groups: MarriageGroup[] = spouseIds.map((sp) => ({
      spouseId: sp,
      childIds: (bySpouse.get(sp) ?? []).slice().sort(cmp),
    }));
    groups.sort((a, b) => compareBirth(oldest(a.childIds), oldest(b.childIds)));
    // Children with no recorded second parent hang under the spine itself (a
    // null-spouse group), kept separate so a polygamous spine never implies a
    // wrong mother. A lone spine with only single-parent kids stays monogamous
    // (one group) and keeps the classic look.
    if (singles.length > 0) {
      groups.push({ spouseId: null, childIds: singles.sort(cmp) });
    }
    result.set(spine, groups);
  }
  return result;
}

/** Distinct-spouse count that makes a spine use the polygamous arrangement. */
function spouseCount(groups: MarriageGroup[] | undefined): number {
  return groups ? groups.filter((g) => g.spouseId).length : 0;
}

// --- Genealogy layout constants -------------------------------------------
// Gap between adjacent generations (between the near edges of two rows).
const MAIN_GAP = 92;
// Cross-axis gap between sibling subtrees within one sibship.
const SIBLING_GAP = 40;
// Cross-axis gap between the paternal and maternal ancestor bands of a couple.
const BAND_GAP = 56;

/**
 * Focal-rooted genealogy ("hourglass") layout. Roots the tree at one person
 * (the "You" card) and draws ancestors fanning **up** as a binary pedigree and
 * descendants fanning **down** as a tidy tree. Because each ancestor's two
 * parent-couples get disjoint reserved cross-axis bands, the paternal and
 * maternal branches never compete for the same space — this is what eliminates
 * the "diamond" tangle a generic layered layout produces.
 *
 * The whole computation runs in generic (main, cross) coordinates — main =
 * generation axis, cross = sibling-spread axis — then projects to (x, y) for the
 * requested orientation, so TB and LR both pack without overlap.
 */
export function buildGenealogyLayout(
  tree: LayoutInput,
  orientation: Orientation,
  selfPersonId?: string | null,
): Map<string, Pos> {
  const isTB = orientation === "TB";
  // A card's extent along the cross axis, and the per-generation step.
  const crossCard = isTB ? NODE_WIDTH : NODE_HEIGHT;
  const mainStep = (isTB ? NODE_HEIGHT : NODE_WIDTH) + MAIN_GAP;

  const { groups, groupOf } = computeCouples(tree);
  const unitById = new Map(groups.map((g) => [g.id, g]));
  const unitOf = (pid: string): Couple | undefined => {
    const gid = groupOf.get(pid);
    return gid ? unitById.get(gid) : undefined;
  };

  const birthById = new Map<string, string | null>();
  for (const p of tree.persons) birthById.set(p.id, p.birthDate ?? null);

  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) => {
    const a = m.get(k);
    if (a) a.push(v);
    else m.set(k, [v]);
  };
  for (const { parentId, childId } of tree.parentChild) {
    push(parentsByChild, childId, parentId);
    push(childrenByParent, parentId, childId);
  }

  const byBirth = (a: string, b: string) =>
    compareBirth(birthById.get(a) ?? null, birthById.get(b) ?? null);
  // Member order within a couple: oldest first (left in TB / top in LR).
  const orderedMembers = (u: Couple) => [...u.memberIds].sort(byBirth);

  // Ordered marriage groups per person (shared with buildFlow). A spine uses the
  // polygamous arrangement once it has two or more spouses; a lone single-parent
  // group keeps the classic look.
  const marriages = computeMarriages(tree);
  const marriageGroupsOf = (spineId: string): MarriageGroup[] =>
    marriages.get(spineId) ?? [];
  const isPolygamous = (spineId: string) =>
    spouseCount(marriages.get(spineId)) >= 2;

  const positions = new Map<string, Pos>();
  const visited = new Set<string>();

  // Write a single card at a cross-axis center on a given generation row, with
  // an optional extra main-axis offset (`dy`, in px) — used to push a polygamous
  // spine's whole descendant block down so its staggered marriage bars have room.
  const place = (id: string, crossCenter: number, row: number, dy = 0) => {
    const mainTop = row * mainStep + dy;
    const crossTop = crossCenter - crossCard / 2;
    positions.set(
      id,
      isTB ? { x: crossTop, y: mainTop } : { x: mainTop, y: crossTop },
    );
  };
  // A child-unit plus the blood child (spine) that leads it — the spine drives
  // the downward recursion so a polygamous child lays out its own marriages.
  type ChildEntry = { unit: Couple; spine: string };
  // The child-units of a couple (units led by each of its children), age-ordered.
  const childUnitsOf = (u: Couple): ChildEntry[] => {
    const kids: string[] = [];
    for (const m of u.memberIds) {
      for (const c of childrenByParent.get(m) ?? []) {
        if (!kids.includes(c)) kids.push(c);
      }
    }
    kids.sort(byBirth);
    const seen = new Set<string>();
    const res: ChildEntry[] = [];
    for (const c of kids) {
      const cu = unitOf(c);
      if (!cu || seen.has(cu.id)) continue;
      seen.add(cu.id);
      res.push({ unit: cu, spine: c });
    }
    return res;
  };

  // --- Block model ---------------------------------------------------------
  // A Block is a set of already-laid-out card nodes in local cross coordinates,
  // plus an `anchor` (the cross center of the block's key unit). Blocks compose
  // by shifting: every layout primitive returns one, so descendants, sibling
  // flanks, and ancestor bands all merge with the same arithmetic.
  type BNode = { id: string; c: number; row: number; dy?: number };
  type Block = { nodes: BNode[]; anchor: number };
  const shift = (b: Block, dx: number): Block => ({
    nodes: b.nodes.map((n) => ({ ...n, c: n.c + dx })),
    anchor: b.anchor + dx,
  });
  // Cross-axis [lo, hi] a block occupies (card edges included).
  const extent = (b: Block): [number, number] => {
    if (b.nodes.length === 0) return [b.anchor, b.anchor];
    let lo = Infinity;
    let hi = -Infinity;
    for (const n of b.nodes) {
      lo = Math.min(lo, n.c);
      hi = Math.max(hi, n.c);
    }
    return [lo - crossCard / 2, hi + crossCard / 2];
  };
  // Pack blocks left-to-right with SIBLING_GAP between them. Returns the placed
  // blocks (in a shared frame starting at 0) and the frame's [lo, hi].
  const packRow = (blocks: Block[]): { placed: Block[]; lo: number; hi: number } => {
    const placed: Block[] = [];
    let cursor = 0;
    for (const b of blocks) {
      const [lo, hi] = extent(b);
      placed.push(shift(b, cursor - lo));
      cursor += hi - lo + SIBLING_GAP;
    }
    return { placed, lo: 0, hi: Math.max(0, cursor - SIBLING_GAP) };
  };
  // A lone/couple unit's own cards, anchored at cross 0.
  const unitBlock = (u: Couple, row: number): Block => {
    const order = orderedMembers(u);
    if (order.length === 1) return { nodes: [{ id: order[0], c: 0, row }], anchor: 0 };
    const d = (crossCard + SPOUSE_GAP) / 2;
    return {
      nodes: [
        { id: order[0], c: -d, row },
        { id: order[1], c: d, row },
      ],
      anchor: 0,
    };
  };

  const parentUnitOf = (m: string): Couple | undefined => {
    const pids = parentsByChild.get(m);
    if (!pids || pids.length === 0) return undefined;
    return unitOf(pids[0]);
  };
  // Units led by m's siblings (m's parents' other children), excluding m's own
  // unit and anything already placed.
  const siblingUnits = (m: string, own: Couple): ChildEntry[] => {
    const p = parentUnitOf(m);
    if (!p) return [];
    return childUnitsOf(p).filter(
      (e) => e.unit.id !== own.id && !visited.has(e.unit.id),
    );
  };

  // --- Downward tidy tree (descendants) ------------------------------------
  // Each subtree owns a disjoint cross interval, so nothing overlaps. The parent
  // couple is centered over its children comb.
  //
  // `spineId` is the blood descendant the subtree hangs from (defaults to the
  // unit's first member). When that spine has 2+ spouses we switch to the
  // polygamous arrangement (spine stays put, spouses stack to one side, each
  // marriage's children grouped under its spouse).
  const descBlock = (
    u: Couple,
    row: number,
    spineId?: string,
  ): Block | null => {
    if (visited.has(u.id)) return null;
    const spine = spineId && u.memberIds.includes(spineId) ? spineId : u.memberIds[0];
    if (isPolygamous(spine)) return descPolygamous(spine, u, row);
    visited.add(u.id);
    const self = unitBlock(u, row);
    const kids: Block[] = [];
    for (const e of childUnitsOf(u)) {
      const b = descBlock(e.unit, row + 1, e.spine);
      if (b) kids.push(b);
    }
    if (kids.length === 0) return self;
    const { placed } = packRow(kids);
    const center =
      (placed[0].anchor + placed[placed.length - 1].anchor) / 2;
    const s = shift(self, center - self.anchor);
    return { nodes: [...s.nodes, ...placed.flatMap((p) => p.nodes)], anchor: center };
  };

  // Polygamous spine: the spine and its spouses sit in one row as a chain
  // (spine — wife1 — wife2 — …), and each marriage's children fill the GAP just
  // before that wife. So the children of (spine, wifeᵢ) sit between the previous
  // card and wifeᵢ, and hang straight down from that segment — exactly like a
  // normal couple's children, one couple-bar per gap (drawn in buildFlow). All
  // children stay on the single child row; the gaps widen to fit each comb.
  const descPolygamous = (spine: string, u: Couple, row: number): Block => {
    visited.add(u.id);
    const groups = marriageGroupsOf(spine);
    const nodes: BNode[] = [{ id: spine, c: 0, row }];

    // Build a child comb (anchored at its own center).
    const combOf = (childIds: string[]): Block | null => {
      const kidBlocks: Block[] = [];
      for (const cid of childIds) {
        const cu = unitOf(cid);
        if (!cu) continue;
        const b = descBlock(cu, row + 1, cid);
        if (b) kidBlocks.push(b);
      }
      if (kidBlocks.length === 0) return null;
      const { placed } = packRow(kidBlocks);
      return { nodes: placed.flatMap((p) => p.nodes), anchor: 0 };
    };
    const placeCombAt = (comb: Block, center: number) => {
      const [lo, hi] = extent(comb);
      const dx = center - (lo + hi) / 2;
      for (const n of comb.nodes) nodes.push({ ...n, c: n.c + dx });
    };
    const widthOf = (comb: Block) => {
      const [lo, hi] = extent(comb);
      return hi - lo;
    };

    // `cursor` tracks the running right edge along the spouse row.
    let cursor = crossCard / 2; // spine's right edge (spine center = 0)

    // Children with no recorded second parent hang directly under the spine.
    const single = groups.find((g) => !g.spouseId);
    if (single) {
      const comb = combOf(single.childIds);
      if (comb) {
        placeCombAt(comb, 0);
        cursor = Math.max(cursor, widthOf(comb) / 2);
      }
    }

    // Each marriage's comb fills the gap, then its wife card follows.
    for (const g of groups) {
      if (!g.spouseId) continue;
      const su = unitOf(g.spouseId);
      if (su) visited.add(su.id);
      const comb = combOf(g.childIds);
      if (comb) {
        const w = widthOf(comb);
        const combCenter = cursor + SIBLING_GAP + w / 2;
        placeCombAt(comb, combCenter);
        cursor = combCenter + w / 2 + SIBLING_GAP;
      } else {
        cursor += SPOUSE_GAP;
      }
      const wifeCenter = cursor + crossCard / 2;
      nodes.push({ id: g.spouseId, c: wifeCenter, row });
      cursor = wifeCenter + crossCard / 2;
    }
    return { nodes, anchor: 0 };
  };

  // --- Upward lineage (ancestors + collaterals) ----------------------------
  // For a spine unit, attach each member's siblings (as descendant subtrees)
  // flanking outward, then center each member's parent-couple band over
  // [that member's flank + the member's card], recursing up. Disjoint bands +
  // outward flanks keep maternal/paternal branches from ever colliding.
  //
  // `reserveLeft/Right` say how far, on each side of this unit's cross center,
  // the spine's own descendants (e.g. the focal's sibling comb) extend at the
  // rows below. Flanks must clear that reserved interval — otherwise the
  // members' siblings' children (the focal's cousins) land on top of the
  // focal's own children-row. Without it, the two combs are packed
  // independently and collide by a slot on each side.
  const buildAround = (
    u: Couple,
    row: number,
    emitSelf: boolean,
    reserveLeft = 0,
    reserveRight = 0,
  ): Block => {
    visited.add(u.id);
    const order = orderedMembers(u);
    const nodes: BNode[] = [];
    const d = (crossCard + SPOUSE_GAP) / 2;

    if (order.length === 2) {
      const [mL, mR] = order;
      if (emitSelf) {
        nodes.push({ id: mL, c: -d, row }, { id: mR, c: d, row });
      }

      // Left member's siblings as descendant subtrees, packed just left of its
      // card — but never closer in than the reserved central interval, so the
      // flank's descendants clear the spine's children-row. The "group" is the
      // flank plus the member card.
      const lf = siblingUnits(mL, u)
        .map((e) => descBlock(e.unit, row, e.spine))
        .filter((b): b is Block => b !== null);
      const leftClear = Math.min(-d - crossCard / 2, -reserveLeft);
      let leftGroupLo = -d - crossCard / 2;
      const leftGroupHi = -d + crossCard / 2;
      if (lf.length > 0) {
        const { placed, hi } = packRow(lf);
        const fshift = leftClear - SIBLING_GAP - hi;
        for (const b of placed) nodes.push(...shift(b, fshift).nodes);
        leftGroupLo = Math.min(...placed.map((b) => extent(b)[0])) + fshift;
      }

      // Right member's siblings, packed just right of its card (and clear of the
      // reserved central interval).
      const rf = siblingUnits(mR, u)
        .map((e) => descBlock(e.unit, row, e.spine))
        .filter((b): b is Block => b !== null);
      const rightClear = Math.max(d + crossCard / 2, reserveRight);
      const rightGroupLo = d - crossCard / 2;
      let rightGroupHi = d + crossCard / 2;
      if (rf.length > 0) {
        const { placed, lo } = packRow(rf);
        const fshift = rightClear + SIBLING_GAP - lo;
        for (const b of placed) nodes.push(...shift(b, fshift).nodes);
        rightGroupHi = Math.max(...placed.map((b) => extent(b)[1])) + fshift;
      }

      // Each parent-couple band is centered over its child group; if the two
      // bands would collide (e.g. no flanks to separate them), push them apart
      // symmetrically so the paternal/maternal columns stay disjoint. Each
      // member's group also covers its share of the reserved interval, so the
      // grandparent band's own flanks clear this member's full footprint.
      const lFootHalf = Math.max((leftGroupHi - leftGroupLo) / 2, reserveLeft);
      const rFootHalf = Math.max((rightGroupHi - rightGroupLo) / 2, reserveRight);
      const PL = parentUnitOf(mL);
      const PR = parentUnitOf(mR);
      const lband =
        PL && !visited.has(PL.id)
          ? buildAround(PL, row - 1, true, lFootHalf, lFootHalf)
          : null;
      const rband =
        PR && !visited.has(PR.id)
          ? buildAround(PR, row - 1, true, rFootHalf, rFootHalf)
          : null;
      let lCenter = (leftGroupLo + leftGroupHi) / 2;
      let rCenter = (rightGroupLo + rightGroupHi) / 2;
      if (lband && rband) {
        const [, lHi] = extent(lband);
        const [rLo] = extent(rband);
        const lAhi = lHi - lband.anchor;
        const rAlo = rLo - rband.anchor;
        const gap = rCenter + rAlo - (lCenter + lAhi);
        if (gap < BAND_GAP) {
          const pushAmt = (BAND_GAP - gap) / 2;
          lCenter -= pushAmt;
          rCenter += pushAmt;
        }
      }
      if (lband) nodes.push(...shift(lband, lCenter - lband.anchor).nodes);
      if (rband) nodes.push(...shift(rband, rCenter - rband.anchor).nodes);
      return { nodes, anchor: 0 };
    }

    // Lone unit: weave the member into its siblings as one age-ordered comb,
    // then center the parent band over the whole comb.
    const m = order[0];
    const sibs = siblingUnits(m, u);
    type Item = { birth: string | null; block?: Block };
    const items: Item[] = sibs.map((e) => ({
      birth: birthById.get(e.spine) ?? null,
      block: descBlock(e.unit, row, e.spine) ?? undefined,
    }));
    items.push({ birth: birthById.get(m) ?? null });
    items.sort((a, b) => compareBirth(a.birth, b.birth));
    let cursor = 0;
    let selfCenter = 0;
    const combNodes: BNode[] = [];
    for (const it of items) {
      if (!it.block) {
        selfCenter = cursor + crossCard / 2;
        if (emitSelf) combNodes.push({ id: m, c: selfCenter, row });
        cursor += crossCard + SIBLING_GAP;
      } else {
        const [lo, hi] = extent(it.block);
        const sb = shift(it.block, cursor - lo);
        combNodes.push(...sb.nodes);
        cursor += hi - lo + SIBLING_GAP;
      }
    }
    // Recenter so the member sits at cross 0 (the block anchor).
    for (const n of combNodes) nodes.push({ ...n, c: n.c - selfCenter });
    const band = parentUnitOf(m);
    if (band && !visited.has(band.id)) {
      // The comb spans every sibling plus the member's own slot (at cross 0).
      let lo = -crossCard / 2;
      let hi = crossCard / 2;
      for (const n of nodes) {
        lo = Math.min(lo, n.c - crossCard / 2);
        hi = Math.max(hi, n.c + crossCard / 2);
      }
      const combCenter = (lo + hi) / 2;
      // Reserve the comb's half-width on each side of its center so the parent
      // band's flanks (this member's cousins) clear the comb's children-row.
      const half = (hi - lo) / 2;
      const bandBlock = buildAround(band, row - 1, true, half, half);
      nodes.push(...shift(bandBlock, combCenter - bandBlock.anchor).nodes);
    }
    return { nodes, anchor: 0 };
  };

  // --- Compose the hourglass -----------------------------------------------
  let focal: Couple | undefined;
  if (selfPersonId && groupOf.has(selfPersonId)) focal = unitOf(selfPersonId);
  if (!focal) {
    focal = groups.find((g) =>
      g.memberIds.every((m) => !(parentsByChild.get(m)?.length)),
    );
  }
  if (!focal) focal = groups[0];

  if (focal) {
    // Descendants (incl. focal cards) centered at cross 0.
    const desc = descBlock(focal, 0, selfPersonId ?? undefined);
    const descCentered = desc ? shift(desc, -desc.anchor) : null;
    // Siblings + ancestors around the focal, sharing the same cross-0 center.
    const around = buildAround(focal, 0, false);
    const all = [...(descCentered?.nodes ?? []), ...around.nodes];
    for (const n of all) place(n.id, n.c, n.row, n.dy ?? 0);
  }

  // Seat additional / former spouses right beside their already-placed partner
  // (a dashed bar will connect them) instead of leaving them to be parked far
  // away. The tidy layout only pairs one spouse per person, so extras land here.
  const extraSpouseStep = new Map<string, number>();
  for (const pr of tree.partnerships) {
    const aPlaced = positions.has(pr.partnerAId);
    const bPlaced = positions.has(pr.partnerBId);
    if (aPlaced === bPlaced) continue; // both already placed, or neither
    const anchorId = aPlaced ? pr.partnerAId : pr.partnerBId;
    const newId = aPlaced ? pr.partnerBId : pr.partnerAId;
    const ap = positions.get(anchorId);
    if (!ap) continue;
    const k = (extraSpouseStep.get(anchorId) ?? 0) + 1;
    extraSpouseStep.set(anchorId, k);
    const step = (crossCard + SPOUSE_GAP) * k;
    positions.set(
      newId,
      isTB ? { x: ap.x + step, y: ap.y } : { x: ap.x, y: ap.y + step },
    );
  }

  // Park anyone the focal traversal never reached so they are never lost.
  const unplaced = tree.persons.filter((p) => !positions.has(p.id));
  if (unplaced.length > 0) {
    let maxMain = 0;
    for (const p of positions.values()) maxMain = Math.max(maxMain, isTB ? p.y : p.x);
    const parkRow = Math.round(maxMain / mainStep) + 2;
    let cross = 0;
    for (const p of unplaced) {
      place(p.id, cross + crossCard / 2, parkRow);
      cross += crossCard + SIBLING_GAP;
    }
  }

  return positions;
}

/**
 * Seed canvas positions for a freshly-created tree. Kept for the onboarding
 * route; routes through the genealogy layout with a parentless-root fallback.
 */
export function computeDagreLayout(
  persons: Pick<PersonDTO, "id">[],
  parentChild: { parentId: string; childId: string }[],
): Map<string, Pos> {
  return buildGenealogyLayout({ persons, parentChild, partnerships: [] }, "TB");
}

/** Build React Flow nodes + edges from a tree (always auto-laid-out). */
export function buildFlow(
  tree: TreeDTO,
  orientation: Orientation = "TB",
): { nodes: FlowNode[]; edges: Edge[] } {
  const positions = buildGenealogyLayout(tree, orientation, tree.selfPersonId);
  const unions = computeUnions(tree);

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

  // Marriage ordering (shared with the layout) so a polygamous parent's child
  // connectors are staggered in the same order the spouses are laid out.
  const marriages = computeMarriages(tree);
  // The polygamous spine of a union (the parent with 2+ spouses), or null.
  const polySpineOf = (parentIds: string[]): string | null => {
    for (const p of parentIds) if (spouseCount(marriages.get(p)) >= 2) return p;
    return null;
  };
  // Real partnerships whose own bar we suppress because the marriage is drawn as
  // a chain-segment bar instead (polygamous spines).
  const suppressedPartnerships = new Set<string>();

  // Junction per union: children hang from a single branching point.
  for (const u of unions) {
    const parents = u.parentIds.filter((id) => positions.has(id));
    const children = u.childIds.filter((id) => positions.has(id));
    if (parents.length === 0) continue;

    const parentCenters = parents.map(center);
    const avg = (sel: (c: Pos) => number) =>
      parentCenters.reduce((s, c) => s + sel(c), 0) / parentCenters.length;
    const childCenters = children.map(center);
    const childAvg = (sel: (c: Pos) => number) =>
      childCenters.length
        ? childCenters.reduce((s, c) => s + sel(c), 0) / childCenters.length
        : avg(sel);

    const jid = unionNodeId(u.key);
    const spine = polySpineOf(u.parentIds);

    // A classic childless couple is shown by its spouse bar alone; only
    // polygamous marriages need an explicit (possibly childless) junction.
    if (children.length === 0 && !spine) continue;

    if (spine) {
      // --- Polygamous marriage: one couple-bar per chain gap ----------------
      // The spine and its spouses form a row chain (spine — wife1 — wife2 — …).
      // THIS marriage's children fill the gap just before its wife, so we render
      // the segment between the previous chain card and the wife as an ordinary
      // couple bar with the children hanging straight down from it — identical
      // to a normal couple, just chained. Single-parent kids hang under the spine.
      const wives = (marriages.get(spine) ?? [])
        .filter((g) => g.spouseId)
        .map((g) => g.spouseId as string);
      const spouseId = u.parentIds.find((p) => p !== spine) ?? null;
      let segLeft = spine;
      if (spouseId) {
        const wi = wives.indexOf(spouseId);
        segLeft = wi > 0 ? wives[wi - 1] : spine;
      }
      const segIds = (spouseId ? [segLeft, spouseId] : [spine]).filter((id) =>
        positions.has(id),
      );
      const segAvg = (sel: (c: Pos) => number) =>
        segIds.map(center).reduce((s, c) => s + sel(c), 0) / segIds.length;

      // Junction at the segment's trailing edge, centered over the children.
      let jx: number;
      let jy: number;
      if (isTB) {
        jx = children.length ? childAvg((c) => c.x) : segAvg((c) => c.x);
        jy = segAvg((c) => c.y) + NODE_HEIGHT / 2 - JUNCTION_HANDLE_OFFSET;
      } else {
        jx = segAvg((c) => c.x) + NODE_WIDTH / 2 - JUNCTION_HANDLE_OFFSET;
        jy = children.length ? childAvg((c) => c.y) : segAvg((c) => c.y);
      }
      junctionNodes.push({
        id: jid,
        type: "junction",
        position: { x: jx, y: jy },
        data: {},
        draggable: false,
        selectable: false,
      });

      // The chain bar between the two consecutive cards, bridged to the junction
      // (just like a normal couple). The real partnership's own bar is suppressed
      // below so we don't also draw spine→wife across the intervening cards.
      if (spouseId && positions.has(segLeft) && positions.has(spouseId)) {
        const mx = isTB ? jx : segAvg((c) => c.x);
        const my = isTB ? segAvg((c) => c.y) : jy;
        const mid = `m:${u.key}`;
        junctionNodes.push({
          id: mid,
          type: "junction",
          position: { x: mx, y: my },
          data: {},
          draggable: false,
          selectable: false,
        });
        edges.push({
          id: `mj:${u.key}`,
          source: mid,
          target: jid,
          sourceHandle: isTB ? "out-bottom" : "out-right",
          targetHandle: isTB ? "in-top" : "in-left",
          type: "straight",
          style: edgeStyle,
        });
        const lFirst = isTB
          ? center(segLeft).x <= center(spouseId).x
          : center(segLeft).y <= center(spouseId).y;
        const [first, second] = lFirst ? [segLeft, spouseId] : [spouseId, segLeft];
        const pr = tree.partnerships.find(
          (p) => unionKey([p.partnerAId, p.partnerBId]) === u.key,
        );
        edges.push({
          id: `sp:${u.key}`,
          source: first,
          target: second,
          sourceHandle: isTB ? "right" : "bottom",
          targetHandle: isTB ? "left" : "top",
          type: "smoothstep",
          data: { spouse: true },
          selectable: false,
          style: pr && !pr.current ? { ...edgeStyle, strokeDasharray: "5 4" } : edgeStyle,
        });
        suppressedPartnerships.add(unionKey([spine, spouseId]));
      }

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
      continue;
    }

    // --- Classic couple / single parent -------------------------------------
    // Children branch from the couple's cross-axis midpoint at its TRAILING
    // edge (bottom in TB, right in LR) — not its center, keeping the stem's
    // run in the clear channel between generations.
    let jx: number;
    let jy: number;
    if (isTB) {
      jx = avg((c) => c.x);
      jy = avg((c) => c.y) + NODE_HEIGHT / 2 - JUNCTION_HANDLE_OFFSET;
    } else {
      jx = avg((c) => c.x) + NODE_WIDTH / 2 - JUNCTION_HANDLE_OFFSET;
      jy = avg((c) => c.y);
    }

    junctionNodes.push({
      id: jid,
      type: "junction",
      position: { x: jx, y: jy },
      data: {},
      draggable: false,
      selectable: false,
    });

    // For a couple, the spouse bar sits at the couple's main-axis CENTER while
    // the child junction sits at its TRAILING edge; bridge the two so the
    // relationship line and the parent-child stem form one continuous line.
    if (parents.length === 2) {
      const mx = isTB ? jx : avg((c) => c.x);
      const my = isTB ? avg((c) => c.y) : jy;
      const mid = `m:${u.key}`;
      junctionNodes.push({
        id: mid,
        type: "junction",
        position: { x: mx, y: my },
        data: {},
        draggable: false,
        selectable: false,
      });
      edges.push({
        id: `mj:${u.key}`,
        source: mid,
        target: jid,
        sourceHandle: isTB ? "out-bottom" : "out-right",
        targetHandle: isTB ? "in-top" : "in-left",
        type: "straight",
        style: edgeStyle,
      });
    }

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
  // drawn leading->trailing so the connector never reverses. Polygamous
  // marriages are skipped here — they are shown by their chain-segment bars.
  for (const pair of tree.partnerships) {
    if (!positions.has(pair.partnerAId) || !positions.has(pair.partnerBId)) {
      continue;
    }
    const a = pair.partnerAId;
    const b = pair.partnerBId;
    if (suppressedPartnerships.has(unionKey([a, b]))) continue;
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
      // Former partners get a dashed bar to set them apart from current ones.
      style: pair.current ? edgeStyle : { ...edgeStyle, strokeDasharray: "5 4" },
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
