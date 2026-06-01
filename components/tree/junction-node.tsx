"use client";

import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

/**
 * Invisible branching point. Sits on a couple's spouse bar (or under a lone
 * parent); children connect up to its single source handle so siblings share
 * one clean stem instead of a line per parent.
 */
function JunctionNodeComponent() {
  const hidden = "!h-0 !w-0 !min-w-0 !border-0 !bg-transparent";
  // Pin every handle to the node's exact center. React Flow otherwise renders
  // each handle a few px off the node origin (edge of the default 6px handle
  // box), which left visible gaps where the spouse bar, the bridge, and the
  // child stems were supposed to meet. Centering all handles makes every
  // junction-based edge start/end at the same point, so the parent
  // relationship line and the parent-child stem form one continuous run. The
  // `position` prop still controls which way each edge leaves (down/right).
  const centered: React.CSSProperties = {
    left: "50%",
    top: "50%",
    right: "auto",
    bottom: "auto",
    width: 0,
    height: 0,
    minWidth: 0,
    minHeight: 0,
    transform: "translate(-50%, -50%)",
  };
  return (
    <div className="h-px w-px">
      <Handle type="source" position={Position.Bottom} id="out-bottom" className={hidden} style={centered} />
      <Handle type="source" position={Position.Right} id="out-right" className={hidden} style={centered} />
      {/* Target handles let a couple's spouse-bar midpoint feed this junction. */}
      <Handle type="target" position={Position.Top} id="in-top" className={hidden} style={centered} />
      <Handle type="target" position={Position.Left} id="in-left" className={hidden} style={centered} />
    </div>
  );
}

export const JunctionNode = memo(JunctionNodeComponent);
