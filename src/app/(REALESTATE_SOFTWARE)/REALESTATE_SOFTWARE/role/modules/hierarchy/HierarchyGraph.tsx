'use client';

// Shared org-chart canvas for the two IT visualizer pages
// (role/it/hierarchy and role/it/payouts/visualize). Loads lazily,
// level by level, via getHierarchyChildrenAction — the root (Company)
// on mount, then one more level each time a node is expanded. This is
// what lets the same component handle 5k+ users: nothing is ever
// fetched or laid out beyond what's actually visible on screen.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Loader2, ChevronRight, Building2, Users as UsersIcon, UserRound } from 'lucide-react';
import { getHierarchyChildrenAction, getHierarchyNodeAction, type HierarchyNode } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/hierarchy/actions';
import type { SaleFinancials } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/payouts/actions';

const formatINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
// A real payee's card carries a full explanatory sentence rather than
// just a percentage, so it needs more room than a plain org-chart box —
// both wider (less aggressive word-wrap) and taller (dagre lays out by
// a fixed height per node; without this, payee cards would visually
// overlap the row below them since dagre has no idea the real rendered
// content grew).
const PAYEE_NODE_WIDTH = 260;
const PAYEE_NODE_HEIGHT = 148;
const CUSTOMER_NODE_ID = '__customer__';
const CUSTOMER_NODE_WIDTH = 280;
const CUSTOMER_NODE_HEIGHT = 140;
// A synthetic, label-less node sitting between "the Company" (every
// active CEO) and whatever they share as children (Governing Council
// members, the Unassigned Directors bucket). With N CEOs and M shared
// children that's normally N×M crossing lines fanning out edge-to-edge
// — this collapses it to N lines converging on one point, then M lines
// fanning back out, the standard org-chart "bus" pattern. Only used at
// the root level, where the server guarantees every CEO really does
// share the exact same child set (getHierarchyChildrenAction's
// parentRole==='ceo' branch always returns the full GC+unassigned list
// regardless of which CEO was expanded) — everywhere else in the tree
// a node has exactly one real parent, so no junction is needed.
const JUNCTION_ID = '__company_trunk__';
const JUNCTION_SIZE = 14;

interface OrgNodeData extends Record<string, unknown> {
  full_name: string;
  roleLabel: string;
  role: string;
  hasChildren: boolean;
  expanded: boolean;
  loading: boolean;
  highlighted: boolean;
  /** Deactivated people are drawn, not hidden — greyed, dashed and
   * labelled, so the org's real shape stays visible and a deactivated
   * person can still be found. */
  isActive: boolean;
  onExpand: (id: string) => void;
  /** This person's own cut on the sale being visualized — only ever set
   * for someone who's a REAL payee (looked up straight from
   * S_sales_payouts via financials.payeeDetails), never invented for a
   * sibling just because they're on screen. Undefined outside the
   * per-transaction payout view entirely. previousRoleLabel is resolved
   * client-side in rebuild() (cross-referencing every other payee's own
   * tierPercentage against this one's previousTierPercentage) purely so
   * the sentence can name who the gap is measured against, rather than
   * leaving it as "the tier below." */
  financialDetail?: { percentage: number; amount: number; tierPercentage: number; previousTierPercentage: number; previousRoleLabel: string | null; splitCount: number };
}

function OrgNode({ id, data }: NodeProps) {
  const d = data as OrgNodeData;
  const isSpecial = d.role === 'ceo' || d.role === 'governing_council' || d.role === 'unassigned';
  const fd = d.financialDetail;

  return (
    <div
      className={`rounded-xl border shadow-sm px-3 py-2 text-left transition-all ${
        !d.isActive
          ? `bg-amber-50 border-dashed ${d.highlighted ? 'border-amber-500 ring-2 ring-amber-300' : 'border-amber-300'}`
          : d.highlighted
          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
          : isSpecial
          ? 'bg-[#1e3a5f]/5 border-[#1e3a5f]/30'
          : 'bg-white border-[#e8ecf2]'
      }`}
      style={{ width: fd ? PAYEE_NODE_WIDTH : NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#c4a55a] !w-2 !h-2" />
      <div className="flex items-center gap-2 min-w-0">
        {d.role === 'ceo' ? <Building2 className="w-3.5 h-3.5 text-[#1e3a5f] shrink-0" /> : <UsersIcon className="w-3.5 h-3.5 text-[#5a6a82] shrink-0" />}
        <p className={`text-sm font-semibold truncate ${d.isActive ? 'text-[#0f1d33]' : 'text-[#5a6a82]'}`}>{d.full_name}</p>
      </div>
      <p className="text-[11px] text-[#5a6a82] mt-0.5 flex items-center gap-1.5 min-w-0">
        <span className="truncate">{d.roleLabel}</span>
        {!d.isActive && (
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 py-px">
            Inactive
          </span>
        )}
      </p>

      {fd && (
        <div className="mt-1.5 pt-1.5 border-t border-emerald-200">
          {/* The seller earns their FULL tier rate — nobody "below" them
              in this chain to subtract, since they closed the sale
              themselves (previousTierPercentage is 0 by construction
              for whoever the seller is). Everyone else earns only the
              GAP between their own tier and whichever tier sits
              directly below them in THIS specific chain — written out
              as a full sentence naming both roles and both rates, not
              just the bare subtraction, so it reads as an explanation
              rather than a formula to decode. */}
          <p className="text-[10.5px] text-[#0f1d33] leading-snug">
            {fd.previousTierPercentage === 0 ? (
              <>
                {d.roleLabel}&apos;s rate is <span className="font-bold">{fd.tierPercentage}%</span> — {d.full_name} closed this sale personally, so they earn their <span className="font-bold">full</span> rate.
              </>
            ) : (
              <>
                {d.roleLabel}&apos;s own rate is <span className="font-bold">{fd.tierPercentage}%</span>, but {fd.previousRoleLabel || 'the tier below'} already covers <span className="font-bold">{fd.previousTierPercentage}%</span> of that — so {d.roleLabel} only earns the leftover{' '}
                <span className="font-bold">{fd.tierPercentage}% − {fd.previousTierPercentage}% = {Math.round((fd.tierPercentage - fd.previousTierPercentage) * 100) / 100}%</span>
                {fd.splitCount > 1 ? (
                  <>
                    , split equally <span className="font-bold">{fd.splitCount} ways</span> among every active {d.roleLabel} — so {d.full_name} personally gets <span className="font-bold">{fd.percentage}%</span>.
                  </>
                ) : (
                  '.'
                )}
              </>
            )}
          </p>
          <p className="text-[12px] font-bold text-emerald-700 mt-1">{formatINR(fd.amount)} earned on this sale</p>
        </div>
      )}

      {/* The Company account (role 'ceo' — the root) stays permanently
          expanded: collapsing "the Company" itself doesn't mean
          anything, and the auto-expand effect would just reopen it
          anyway, so no toggle is offered. */}
      {d.hasChildren && d.role !== 'ceo' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            d.onExpand(id);
          }}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e3a5f] hover:underline disabled:opacity-50"
          disabled={d.loading}
        >
          {d.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className={`w-3 h-3 transition-transform ${d.expanded ? 'rotate-90' : ''}`} />}
          {d.expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[#c4a55a] !w-2 !h-2" />
    </div>
  );
}

/** The customer isn't part of the org tree at all (parent_id is always
 * NULL for a customer account) — this card exists purely to show the
 * sale's own math, attached to the seller by one edge. Land value and
 * what the customer paid are both computePool(plotSize, rate) — the
 * SAME function payout-engine.ts uses for the real commission pool,
 * just fed base_price_at_submission vs mrp_at_submission; shown here as
 * an explicit rate × size = total so the math is checkable at a glance,
 * not just a final number to trust blindly. */
function CustomerNode({ data }: NodeProps) {
  const f = data as unknown as SaleFinancials;
  return (
    <div className="rounded-xl border-2 border-[#c4a55a] bg-[#c4a55a]/5 shadow-md px-3 py-2.5 text-left" style={{ width: CUSTOMER_NODE_WIDTH }}>
      <Handle type="target" position={Position.Top} className="!bg-[#c4a55a] !w-2 !h-2" />
      <div className="flex items-center gap-2 min-w-0">
        <UserRound className="w-3.5 h-3.5 text-[#c4a55a] shrink-0" />
        <p className="text-sm font-semibold text-[#0f1d33] truncate">{f.customerName}</p>
      </div>
      <p className="text-[11px] text-[#5a6a82] mt-0.5 mb-1.5">Customer · {f.plotSizeSqyd} sq.yd</p>

      <div className="space-y-1 text-[10.5px] border-t border-[#c4a55a]/30 pt-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#5a6a82] truncate">Customer paid {formatINR(f.mrpPerSqyd)}×{f.plotSizeSqyd}</span>
          <span className="font-semibold text-[#0f1d33] shrink-0">{formatINR(f.totalCustomerPaid)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#c4a55a]/30">
          <span className="text-[#5a6a82]">Total commission out</span>
          <span className="font-bold text-emerald-700 shrink-0">{formatINR(f.totalCommissionPaid)}</span>
        </div>
      </div>
    </div>
  );
}

/** The trunk itself renders as nothing more than a small dot — it's a
 * routing point, not a person, so it carries no name/role/expand
 * affordance. */
function JunctionNode() {
  return (
    <div className="rounded-full bg-[#c4a55a]" style={{ width: JUNCTION_SIZE, height: JUNCTION_SIZE }}>
      <Handle type="target" position={Position.Top} className="!bg-[#c4a55a] !w-1.5 !h-1.5 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#c4a55a] !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

const nodeTypes = { org: OrgNode, junction: JunctionNode, customer: CustomerNode };

function layout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 90 });

  // Keyed by node object, not just id — a payee's card is wider/taller
  // to fit its explanatory sentence, and "is this a payee" only lives
  // in the node's own data (financialDetail), not in its id.
  const dims = (n: Node) =>
    n.id === JUNCTION_ID
      ? { width: JUNCTION_SIZE, height: JUNCTION_SIZE }
      : n.id === CUSTOMER_NODE_ID
      ? { width: CUSTOMER_NODE_WIDTH, height: CUSTOMER_NODE_HEIGHT }
      : (n.data as OrgNodeData).financialDetail
      ? { width: PAYEE_NODE_WIDTH, height: PAYEE_NODE_HEIGHT }
      : { width: NODE_WIDTH, height: NODE_HEIGHT };
  nodes.forEach((n) => g.setNode(n.id, dims(n)));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const { width, height } = dims(n);
    return { ...n, position: { x: pos.x - width / 2, y: pos.y - height / 2 } };
  });
}

interface HierarchyGraphProps {
  /** Ids that should render green — the payout visualizer's "who gets
   * paid" set. Omit for the plain hierarchy view. */
  highlightIds?: Set<string>;
  /** Nodes to open automatically on load, top-down, so a specific
   * person is on screen without any clicking. Comes from the server
   * (getPayoutLineageForRegistrationAction) as a structural path, so it
   * stays correct even where a rung of the chain earns nothing. */
  expandPath?: string[];
  /** Plain hierarchy browsing (role/hierarchy) wants the whole tree
   * open by default; the per-transaction payout view
   * (role/payouts-visualize) wants ONLY expandPath's one wing open, not
   * everything else in the company. Can't tell these apart from
   * expandPath's VALUE alone — it starts as an empty array on the
   * payout-visualize page too, filled in only after its lineage fetch
   * resolves, so at mount both cases look identical. This is an
   * explicit flag instead, set once per page and never ambiguous. */
  autoExpandAll?: boolean;
  /** The one person who actually made this sale — needed to know where
   * to attach the customer card (one edge, seller -> customer). Omit
   * outside the payout-visualize view. */
  sellerId?: string;
  /** The sale's real math — land value, what the customer paid, each
   * payee's own cut, the total paid out. Omit outside the
   * payout-visualize view; when present, adds the customer card and
   * decorates every payee's own OrgNode with their percentage/amount. */
  financials?: SaleFinancials | null;
  /** Root the tree at this person instead of the Company. Used by the
   * wallet's per-sale view, where a payee should only ever see
   * themselves and what's BELOW them in that sale — never the chain
   * above. Omit for the normal company-wide views. */
  rootId?: string | null;
}

export default function HierarchyGraph({ highlightIds, expandPath, autoExpandAll, sellerId, financials, rootId }: HierarchyGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const childrenCache = useRef<Map<string, HierarchyNode[]>>(new Map());
  // The fetched tree lives in refs (below), which React can't see — so a
  // load that adds children mutates them without triggering any render.
  // This counter is the render trigger: every successful fetch bumps it,
  // and the rebuild effect depends on it. Without this, expanding a node
  // that was ALREADY in expandedIds (which is exactly what the payout
  // auto-expand walk does to the root) left the newly-loaded children
  // invisible — the node read "Collapse" with nothing beneath it.
  const [dataVersion, setDataVersion] = useState(0);

  const rebuild = useCallback(
    (rawById: Map<string, HierarchyNode>, parentOf: Map<string, Set<string>>, roots: Set<string>, expanded: Set<string>) => {
      const visibleIds = new Set<string>();
      const stack = [...roots];
      while (stack.length > 0) {
        const id = stack.pop()!;
        if (visibleIds.has(id)) continue;
        visibleIds.add(id);
        if (expanded.has(id)) {
          const kids = childrenCache.current.get(id) || [];
          kids.forEach((k) => stack.push(k.id));
        }
      }

      // For each payee, who's the OTHER payee whose own tier rate equals
      // THIS payee's previousTierPercentage — i.e. whichever role sits
      // directly below them in this specific chain. Resolved once here
      // (not per-node) by scanning the small payeeDetails map (never
      // more than ~10 entries — one sale's whole chain), so the
      // sentence can name that role instead of saying "the tier below."
      const previousRoleLabelById = new Map<string, string | null>();
      if (financials) {
        const entries = Object.entries(financials.payeeDetails);
        entries.forEach(([pid, pd]) => {
          if (pd.previousTierPercentage === 0) {
            previousRoleLabelById.set(pid, null);
            return;
          }
          const match = entries.find(([, other]) => other.tierPercentage === pd.previousTierPercentage);
          const matchId = match?.[0];
          previousRoleLabelById.set(pid, (matchId && rawById.get(matchId)?.roleLabel) || null);
        });
      }

      const nextNodes: Node[] = [...visibleIds].map((id) => {
        const raw = rawById.get(id)!;
        const payee = financials?.payeeDetails[id];
        return {
          id,
          type: 'org',
          position: { x: 0, y: 0 },
          data: {
            full_name: raw.full_name,
            roleLabel: raw.roleLabel,
            role: raw.role,
            hasChildren: raw.hasChildren,
            expanded: expanded.has(id),
            loading: loadingId === id,
            highlighted: highlightIds?.has(id) || false,
            isActive: raw.is_active !== false,
            onExpand: toggleExpand,
            financialDetail: payee && { ...payee, previousRoleLabel: previousRoleLabelById.get(id) || null },
          } as OrgNodeData,
        };
      });

      // The customer card — one extra node, one extra edge from the
      // seller, entirely separate from the org tree's own parent/child
      // bookkeeping (a customer's parent_id is always NULL; they were
      // never part of this walk to begin with). Only appears once the
      // seller is actually on screen, so it never floats in disconnected.
      if (financials && sellerId && visibleIds.has(sellerId)) {
        nextNodes.push({ id: CUSTOMER_NODE_ID, type: 'customer', position: { x: 0, y: 0 }, data: financials as unknown as Record<string, unknown> });
      }

      // With more than one root (multiple active CEOs, all equally
      // "the Company"), every one of them shares the exact same child
      // set (Governing Council members + Unassigned Directors) — drawn
      // directly, that's a full N×M crossing mesh. Collapsing it
      // through one shared junction point is the standard org-chart
      // "bus" pattern: N lines converge on one dot, then M lines fan
      // back out from it.
      const visibleRoots = [...roots].filter((r) => visibleIds.has(r) && expanded.has(r));
      const rootChildTargets = new Set<string>();
      visibleRoots.forEach((r) => {
        (childrenCache.current.get(r) || []).forEach((k) => {
          if (visibleIds.has(k.id)) rootChildTargets.add(k.id);
        });
      });
      const useTrunk = visibleRoots.length > 1 && rootChildTargets.size > 0;

      if (useTrunk) {
        nextNodes.push({ id: JUNCTION_ID, type: 'junction', position: { x: 0, y: 0 }, data: {} });
      }

      // A node can belong to more than one parent — e.g. two CEOs are
      // both "Company", and Governing Council genuinely reports to
      // both of them, not just whichever CEO's fetch happened to
      // resolve last. So every (parent, child) pair where both are
      // visible AND the parent is actually expanded gets its own edge,
      // rather than each child picking a single parent — EXCEPT the
      // root-level pairs the trunk above already covers.
      const nextEdges: Edge[] = [];
      visibleIds.forEach((id) => {
        const parents = parentOf.get(id);
        if (!parents) return;
        parents.forEach((parentId) => {
          if (!visibleIds.has(parentId) || !expanded.has(parentId)) return;
          if (useTrunk && roots.has(parentId) && rootChildTargets.has(id)) return;
          const highlightEdge = (highlightIds?.has(id) && highlightIds?.has(parentId)) || false;
          nextEdges.push({
            id: `${parentId}->${id}`,
            source: parentId,
            target: id,
            style: highlightEdge ? { stroke: '#10b981', strokeWidth: 2 } : { stroke: '#c9d2e0' },
          } as Edge);
        });
      });

      if (useTrunk) {
        visibleRoots.forEach((r) => {
          nextEdges.push({
            id: `${r}->trunk`,
            source: r,
            target: JUNCTION_ID,
            style: highlightIds?.has(r) ? { stroke: '#10b981', strokeWidth: 2 } : { stroke: '#c9d2e0' },
          } as Edge);
        });
        rootChildTargets.forEach((childId) => {
          nextEdges.push({
            id: `trunk->${childId}`,
            source: JUNCTION_ID,
            target: childId,
            style: highlightIds?.has(childId) ? { stroke: '#10b981', strokeWidth: 2 } : { stroke: '#c9d2e0' },
          } as Edge);
        });
      }

      if (financials && sellerId && visibleIds.has(sellerId)) {
        nextEdges.push({
          id: `${sellerId}->customer`,
          source: sellerId,
          target: CUSTOMER_NODE_ID,
          style: { stroke: '#c4a55a', strokeWidth: 2 },
        } as Edge);
      }

      setNodes(layout(nextNodes, nextEdges));
      setEdges(nextEdges);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadingId, highlightIds, financials, sellerId]
  );

  const rawById = useRef<Map<string, HierarchyNode>>(new Map());
  // Every id that has ever appeared in the id-keyed maps below is a
  // node the app has already seen; a node's PARENTS are a set, not a
  // single id, since the same person (e.g. Governing Council) can
  // legitimately report to more than one "Company" node when there are
  // multiple active CEOs.
  const parentOf = useRef<Map<string, Set<string>>>(new Map());
  const rootIds = useRef<Set<string>>(new Set());

  const loadChildren = useCallback(async (parentId: string | null) => {
    const res = await getHierarchyChildrenAction(parentId);
    if (!res.success) {
      setError(res.error || 'Failed to load the hierarchy.');
      return [];
    }
    res.nodes.forEach((n) => {
      rawById.current.set(n.id, n);
      if (parentId === null) {
        rootIds.current.add(n.id);
      } else {
        if (!parentOf.current.has(n.id)) parentOf.current.set(n.id, new Set());
        parentOf.current.get(n.id)!.add(parentId);
      }
    });
    if (parentId) childrenCache.current.set(parentId, res.nodes);
    setDataVersion((v) => v + 1);
    return res.nodes;
  }, []);

  // Read through a ref rather than closing over expandedIds, so this
  // callback stays referentially stable. It's baked into every node's
  // data by rebuild(), which doesn't list it as a dependency — a
  // changing identity here would hand already-rendered nodes a stale
  // expandedIds and break collapse after the first expand.
  const expandedRef = useRef<Set<string>>(expandedIds);
  expandedRef.current = expandedIds;

  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedRef.current.has(id)) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      if (!childrenCache.current.has(id)) {
        setLoadingId(id);
        await loadChildren(id);
        setLoadingId(null);
      }
      setExpandedIds((prev) => new Set(prev).add(id));
    },
    [loadChildren]
  );

  // Expands the WHOLE tree on load — every card starts open, no manual
  // "Expand" clicking required — but strictly one node at a time rather
  // than firing a whole level's worth of requests at once. A node is
  // fetched, marked expanded (revealing its children on screen), THEN
  // its children join the back of the queue; the tree visibly grows
  // outward piece by piece instead of whole rows popping in at once.
  // Gentler on the API too — at most one request in flight for this
  // walk, regardless of how wide any level is. The visit cap is only a
  // safety net against a cyclic parent_id; real data never gets close.
  useEffect(() => {
    if (!autoExpandAll) return;
    let cancelled = false;
    (async () => {
      const queue = await loadChildren(null);
      let visits = 0;
      while (queue.length > 0 && !cancelled && visits < 20000) {
        const node = queue.shift()!;
        if (!node.hasChildren) continue;
        visits++;
        const kids = await loadChildren(node.id);
        if (cancelled) return;
        setExpandedIds((prev) => (prev.has(node.id) ? prev : new Set(prev).add(node.id)));
        queue.push(...kids);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opens the server-supplied path (Governing Council → Director → …
  // → the seller's parent) top-down, fetching each level then revealing
  // it, so the canvas grows as data arrives rather than sitting still
  // through several round trips and jumping at the end. Only this one
  // branch is ever fetched — not the whole company — so a single
  // transaction's wing opens without pulling in every other wing.
  //
  // Root bootstrap lives here too, not just in the autoExpandAll effect:
  // this is the ONLY path that runs on the payout-visualize page (its
  // autoExpandAll is false), so without fetching+expanding the root
  // here, the CEO node — and everything below it, including the one
  // wing this whole effect exists to reveal — would never load at all.
  //
  // Gated on autoExpandAll ALONE, never on expandPathKey being empty —
  // a CEO-submitted sale has no Director/GC in its chain at all, so the
  // server correctly returns expandPath: [], and an empty string is
  // indistinguishable from "no path yet" by value. Skipping the whole
  // effect on that empty check used to mean a CEO sale's page never
  // even fetched the CEO root itself — blank canvas, nothing wrong with
  // the data, just nothing was ever asked for.
  const expandPathKey = (expandPath || []).join(',');
  useEffect(() => {
    if (autoExpandAll) return;
    const path = expandPathKey ? expandPathKey.split(',') : [];
    let cancelled = false;
    (async () => {
      // Rooted at one person (the wallet's per-sale view) rather than at
      // the Company: seed that single node as the root, then treat it
      // exactly like a normal root below. Nothing above it is ever
      // fetched, so the tree can only run downward from them.
      let roots: HierarchyNode[];
      if (rootId) {
        const res = await getHierarchyNodeAction(rootId);
        if (cancelled) return;
        if (!res.success || !res.node) {
          setError(res.error || 'Could not load your position in this sale.');
          return;
        }
        rawById.current.set(res.node.id, res.node);
        rootIds.current.add(res.node.id);
        setDataVersion((v) => v + 1);
        roots = [res.node];
      } else {
        roots = await loadChildren(null);
      }
      if (cancelled) return;
      // The roots themselves are all that's loaded so far — their OWN
      // children still have to be fetched and cached, or marking the
      // roots "expanded" below has nothing in childrenCache to reveal.
      await Promise.all(roots.filter((r) => r.hasChildren).map((r) => loadChildren(r.id)));
      if (cancelled) return;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        roots.forEach((r) => next.add(r.id));
        return next;
      });

      // Fetched in parallel, not one level at a time. These are
      // independent lookups — each asks "who are this id's children" and
      // none depends on the answer to the one before, because the path
      // itself already came from the server. Awaiting them in sequence
      // cost one full round trip per level (~170ms each), which is the
      // bulk of the wait when focusing someone deep in the tree.
      const toLoad = path.filter((id) => !childrenCache.current.has(id));
      if (toLoad.length > 0) await Promise.all(toLoad.map((id) => loadChildren(id)));
      if (cancelled) return;

      // One state update rather than one per level, so the graph lays out
      // once instead of re-running for every rung of the chain.
      setExpandedIds((prev) => {
        const next = new Set(prev);
        path.forEach((id) => next.add(id));
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandPathKey, loadChildren, rootId]);

  useEffect(() => {
    rebuild(rawById.current, parentOf.current, rootIds.current, expandedIds);
    // dataVersion is what makes a fetch visible — see its declaration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedIds, loadingId, highlightIds, rebuild, dataVersion]);

  const nodeTypesMemo = useMemo(() => nodeTypes, []);

  // React Flow's own `fitView` prop only frames the viewport ONCE, on
  // its very first render — which for this component is almost always
  // before any real data has arrived, since the tree loads lazily in
  // several rounds after mount (root, then auto-expand or the
  // expandPath walk streaming more levels in afterward). Left alone,
  // the camera stays stuck wherever that first near-empty frame put it
  // — badly zoomed in, showing a couple of stray nodes cut off at the
  // edges, exactly what a fixed one-shot fit produces on async data.
  // Re-fitting here on every node-count change (debounced so a burst of
  // rapid loads doesn't visibly fight itself) keeps the camera framed on
  // whatever is actually on screen at each step, and lands on the whole
  // tree once loading finally settles.
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  useEffect(() => {
    if (nodes.length === 0) return;
    const t = setTimeout(() => {
      flowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
    }, 250);
    return () => clearTimeout(t);
  }, [nodes.length]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypesMemo}
        onInit={(instance) => {
          flowInstanceRef.current = instance;
          instance.fitView({ padding: 0.2 });
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        // Only mount the cards currently in the viewport. Depth is already
        // cheap (the chain comes back in one query), but width is not: one
        // person with 300 direct reports means 300 React components, and
        // every pan re-renders them. Safe to switch on here because dagre
        // gives every node an explicit size up front, so nothing has to be
        // measured before it can be culled.
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e8ecf2" gap={20} />
        <Controls />
        <MiniMap pannable zoomable nodeColor={(n) => {
            const nd = n.data as OrgNodeData;
            if (nd?.isActive === false) return '#f59e0b';
            return nd?.highlighted ? '#10b981' : '#c9d2e0';
          }} />
      </ReactFlow>
    </div>
  );
}
