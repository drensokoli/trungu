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
  return (
    <div className="h-px w-px">
      <Handle type="source" position={Position.Bottom} id="out-bottom" className={hidden} />
      <Handle type="source" position={Position.Right} id="out-right" className={hidden} />
    </div>
  );
}

export const JunctionNode = memo(JunctionNodeComponent);
