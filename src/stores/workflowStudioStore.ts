import { create } from "zustand";
import { Edge, MarkerType, Node } from "reactflow";

export type NodeStatus = "idle" | "success" | "running" | "failed" | "blocked";

export interface WorkflowNodeMeta {
  nodeType: string;
  label: string;
  icon: string;
  category: string;
  status: NodeStatus;
}

export type WorkflowNode = Node<WorkflowNodeMeta>;

export interface WorkflowEdgeData {
  status: NodeStatus;
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;

export interface FlowSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface AlignmentGuides {
  x?: number;
  y?: number;
}

export const NODE_EXTENT: [[number, number], [number, number]] = [[0, 0], [3000, 800]];
export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 56;
export const NODE_GAP = 24;
export const MAX_COLLISION_ATTEMPTS = 120;
export const SNAP_GRID: [number, number] = [20, 20];
export const ALIGN_TOLERANCE = 8;
export const HISTORY_LIMIT = 100;

const STACK_NODE_TEMPLATE: Array<WorkflowNodeMeta & { id: string; x: number; y: number }> = [
  { id: "stack-1", nodeType: "github", label: "GitHub", icon: "source", category: "Source", status: "idle", x: 40, y: 320 },
  { id: "stack-2", nodeType: "gh-actions", label: "Actions Runner", icon: "ci", category: "CI Pipeline", status: "idle", x: 280, y: 320 },
  { id: "stack-3", nodeType: "install-dependencies", label: "Install Deps", icon: "ci", category: "Node.js", status: "idle", x: 520, y: 240 },
  { id: "stack-4", nodeType: "lint", label: "Lint", icon: "ci", category: "Quality", status: "idle", x: 760, y: 160 },
  { id: "stack-5", nodeType: "dependency-scan", label: "npm Audit", icon: "security", category: "Security", status: "idle", x: 760, y: 320 },
  { id: "stack-6", nodeType: "test", label: "Unit Tests", icon: "testing", category: "Testing", status: "idle", x: 1000, y: 240 },
  { id: "stack-7", nodeType: "integration-test", label: "Integration Tests", icon: "testing", category: "Testing", status: "idle", x: 1240, y: 240 },
  { id: "stack-8", nodeType: "build", label: "Build App", icon: "ci", category: "Build", status: "idle", x: 1480, y: 240 },
  { id: "stack-9", nodeType: "custom-script", label: "Package Artifact", icon: "ci", category: "Artifact", status: "idle", x: 1720, y: 240 },
  { id: "stack-10", nodeType: "docker-run", label: "Local Preview", icon: "container", category: "Local Runtime", status: "idle", x: 1960, y: 240 },
  { id: "stack-11", nodeType: "unit-test", label: "Smoke Test", icon: "testing", category: "Verification", status: "idle", x: 2200, y: 160 },
  { id: "stack-12", nodeType: "load-test-k6", label: "Optional k6", icon: "testing", category: "Performance", status: "idle", x: 2200, y: 320 },
  { id: "stack-13", nodeType: "alerts", label: "Run Summary", icon: "alerting", category: "Reporting", status: "idle", x: 2440, y: 240 },
];

const STACK_EDGE_TEMPLATE: Array<{ source: string; target: string }> = [
  { source: "stack-1", target: "stack-2" },
  { source: "stack-2", target: "stack-3" },
  { source: "stack-3", target: "stack-4" },
  { source: "stack-3", target: "stack-5" },
  { source: "stack-4", target: "stack-6" },
  { source: "stack-5", target: "stack-6" },
  { source: "stack-6", target: "stack-7" },
  { source: "stack-7", target: "stack-8" },
  { source: "stack-8", target: "stack-9" },
  { source: "stack-9", target: "stack-10" },
  { source: "stack-10", target: "stack-11" },
  { source: "stack-10", target: "stack-12" },
  { source: "stack-11", target: "stack-13" },
  { source: "stack-12", target: "stack-13" },
];

export const createStackNodes = (): WorkflowNode[] =>
  STACK_NODE_TEMPLATE.map((node) => ({
    id: node.id,
    type: "pipeline",
    position: { x: node.x, y: node.y },
    data: {
      nodeType: node.nodeType,
      label: node.label,
      icon: node.icon,
      category: node.category,
      status: node.status,
    },
  }));

export const createStackEdges = (): WorkflowEdge[] =>
  STACK_EDGE_TEMPLATE.map((edge) => ({
    id: `e-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: "workflow",
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(187, 80%, 48%)" },
    data: { status: "idle" },
    style: { stroke: "hsl(187, 80%, 48%)", strokeWidth: 2, opacity: 0.65 },
  }));

const cloneSnapshot = (snapshot: FlowSnapshot): FlowSnapshot => ({
  nodes: snapshot.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data },
  })),
  edges: snapshot.edges.map((edge) => ({
    ...edge,
    style: edge.style ? { ...edge.style } : edge.style,
    markerEnd:
      edge.markerEnd && typeof edge.markerEnd === "object"
        ? { ...edge.markerEnd }
        : edge.markerEnd,
    data: edge.data ? { ...edge.data } : edge.data,
  })),
});

const pushHistory = (history: FlowSnapshot[], snapshot: FlowSnapshot): FlowSnapshot[] => {
  const nextHistory = [...history, cloneSnapshot(snapshot)];
  return nextHistory.length > HISTORY_LIMIT ? nextHistory.slice(nextHistory.length - HISTORY_LIMIT) : nextHistory;
};

const getNodeDimensions = (node: WorkflowNode) => ({
  width: node.width ?? NODE_WIDTH,
  height: node.height ?? NODE_HEIGHT,
});

export const getNodeCenter = (node: WorkflowNode) => {
  const dimensions = getNodeDimensions(node);
  return {
    x: node.position.x + dimensions.width / 2,
    y: node.position.y + dimensions.height / 2,
  };
};

export const isOverlapping = (a: { x: number; y: number }, b: { x: number; y: number }, dimensions = { width: NODE_WIDTH, height: NODE_HEIGHT }) => {
  return (
    a.x < b.x + dimensions.width &&
    a.x + dimensions.width > b.x &&
    a.y < b.y + dimensions.height &&
    a.y + dimensions.height > b.y
  );
};

export const clampPosition = (position: { x: number; y: number }, dimensions = { width: NODE_WIDTH, height: NODE_HEIGHT }) => {
  const minX = NODE_EXTENT[0][0];
  const minY = NODE_EXTENT[0][1];
  const maxX = NODE_EXTENT[1][0] - dimensions.width;
  const maxY = NODE_EXTENT[1][1] - dimensions.height;

  return {
    x: Math.max(minX, Math.min(position.x, maxX)),
    y: Math.max(minY, Math.min(position.y, maxY)),
  };
};

export const resolveCollision = (
  position: { x: number; y: number },
  nodes: WorkflowNode[],
  ignoreNodeId?: string,
  dimensions = { width: NODE_WIDTH, height: NODE_HEIGHT }
) => {
  let candidate = clampPosition(position, dimensions);

  for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt += 1) {
    const hasOverlap = nodes.some((node) => {
      if (node.id === ignoreNodeId) {
        return false;
      }

      const nodeDimensions = getNodeDimensions(node);
      return isOverlapping(candidate, node.position, nodeDimensions);
    });

    if (!hasOverlap) {
      return candidate;
    }

    const nextX = candidate.x + NODE_GAP;
    const maxX = NODE_EXTENT[1][0] - dimensions.width;
    const minX = NODE_EXTENT[0][0];
    const maxY = NODE_EXTENT[1][1] - dimensions.height;

    if (nextX > maxX) {
      candidate = {
        x: minX,
        y: Math.min(candidate.y + NODE_GAP, maxY),
      };
    } else {
      candidate = { x: nextX, y: candidate.y };
    }
  }

  return candidate;
};

const deriveEdgeStatus = (sourceNode?: WorkflowNode, targetNode?: WorkflowNode): NodeStatus => {
  if (!sourceNode || !targetNode) {
    return "idle";
  }

  if (sourceNode.data.status === "blocked" || targetNode.data.status === "blocked") {
    return "blocked";
  }

  if (sourceNode.data.status === "failed" || targetNode.data.status === "failed") {
    return "failed";
  }

  if (sourceNode.data.status === "running" || targetNode.data.status === "running") {
    return "running";
  }

  if (sourceNode.data.status === "success" && targetNode.data.status === "success") {
    return "success";
  }

  return "idle";
};

const edgeStatusStyle: Record<NodeStatus, { stroke: string; opacity: number; dash?: string }> = {
  idle: { stroke: "hsl(187, 80%, 48%)", opacity: 0.55 },
  success: { stroke: "hsl(142, 71%, 45%)", opacity: 0.9 },
  running: { stroke: "hsl(39, 92%, 55%)", opacity: 0.95, dash: "8 4" },
  failed: { stroke: "hsl(0, 84%, 60%)", opacity: 0.95, dash: "5 4" },
  blocked: { stroke: "hsl(11, 90%, 56%)", opacity: 0.95, dash: "2 3" },
};

export const normalizeEdges = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowEdge[] => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return edges
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map((edge) => {
      const status = deriveEdgeStatus(nodeMap.get(edge.source), nodeMap.get(edge.target));
      const style = edgeStatusStyle[status];

      return {
        ...edge,
        type: edge.type ?? "workflow",
        data: {
          ...(edge.data ?? { status: "idle" }),
          status,
        },
        animated: status === "running",
        markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
        style: {
          stroke: style.stroke,
          strokeWidth: 2,
          opacity: style.opacity,
          ...(style.dash ? { strokeDasharray: style.dash } : {}),
          ...(edge.style ?? {}),
        },
      };
    });
};

export interface WorkflowStudioState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  historyPast: FlowSnapshot[];
  historyFuture: FlowSnapshot[];
  setNodes: (
    updater: WorkflowNode[] | ((current: WorkflowNode[]) => WorkflowNode[]),
    withHistory?: boolean
  ) => void;
  setEdges: (
    updater: WorkflowEdge[] | ((current: WorkflowEdge[]) => WorkflowEdge[]),
    withHistory?: boolean
  ) => void;
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  clearSelection: () => void;
  commitSnapshot: () => void;
  applySnapshot: (snapshot: FlowSnapshot) => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  loadStack: () => void;
  setNodeStatus: (nodeId: string, status: NodeStatus, withHistory?: boolean) => void;
  setNodeStatusByType: (nodeType: string, status: NodeStatus) => void;
}

const initialNodes = createStackNodes();
const initialEdges = normalizeEdges(initialNodes, createStackEdges());

const getSnapshot = (state: WorkflowStudioState): FlowSnapshot => ({
  nodes: state.nodes,
  edges: state.edges,
});

export const useWorkflowStudioStore = create<WorkflowStudioState>((set) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  historyPast: [],
  historyFuture: [],

  setNodes: (updater, withHistory = false) =>
    set((state) => {
      const nextNodes = typeof updater === "function" ? updater(state.nodes) : updater;
      const nextEdges = normalizeEdges(nextNodes, state.edges);

      return {
        nodes: nextNodes,
        edges: nextEdges,
        historyPast: withHistory ? pushHistory(state.historyPast, getSnapshot(state)) : state.historyPast,
        historyFuture: withHistory ? [] : state.historyFuture,
      };
    }),

  setEdges: (updater, withHistory = false) =>
    set((state) => {
      const nextEdges = typeof updater === "function" ? updater(state.edges) : updater;
      const normalizedEdges = normalizeEdges(state.nodes, nextEdges);

      return {
        edges: normalizedEdges,
        historyPast: withHistory ? pushHistory(state.historyPast, getSnapshot(state)) : state.historyPast,
        historyFuture: withHistory ? [] : state.historyFuture,
      };
    }),

  setSelection: (nodeIds, edgeIds) =>
    set((state) => {
      const sameNodes = state.selectedNodeIds.length === nodeIds.length && state.selectedNodeIds.every((id, index) => id === nodeIds[index]);
      const sameEdges = state.selectedEdgeIds.length === edgeIds.length && state.selectedEdgeIds.every((id, index) => id === edgeIds[index]);

      if (sameNodes && sameEdges) {
        return state;
      }

      return {
        selectedNodeIds: nodeIds,
        selectedEdgeIds: edgeIds,
      };
    }),

  clearSelection: () =>
    set((state) => {
      if (state.selectedNodeIds.length === 0 && state.selectedEdgeIds.length === 0) {
        return state;
      }

      return {
        selectedNodeIds: [],
        selectedEdgeIds: [],
      };
    }),

  commitSnapshot: () =>
    set((state) => ({
      historyPast: pushHistory(state.historyPast, getSnapshot(state)),
      historyFuture: [],
    })),

  applySnapshot: (snapshot) =>
    set(() => ({
      nodes: cloneSnapshot(snapshot).nodes,
      edges: normalizeEdges(snapshot.nodes, cloneSnapshot(snapshot).edges),
    })),

  undo: () =>
    set((state) => {
      if (state.historyPast.length === 0) {
        return state;
      }

      const previous = state.historyPast[state.historyPast.length - 1];
      const nextPast = state.historyPast.slice(0, -1);
      const nextFuture = [cloneSnapshot(getSnapshot(state)), ...state.historyFuture];

      return {
        nodes: cloneSnapshot(previous).nodes,
        edges: normalizeEdges(previous.nodes, previous.edges),
        historyPast: nextPast,
        historyFuture: nextFuture,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyFuture.length === 0) {
        return state;
      }

      const [next, ...rest] = state.historyFuture;
      const nextPast = [...state.historyPast, cloneSnapshot(getSnapshot(state))];

      return {
        nodes: cloneSnapshot(next).nodes,
        edges: normalizeEdges(next.nodes, next.edges),
        historyPast: nextPast,
        historyFuture: rest,
      };
    }),

  deleteSelection: () =>
    set((state) => {
      if (state.selectedNodeIds.length === 0 && state.selectedEdgeIds.length === 0) {
        return state;
      }

      const nodesToRemove = new Set(state.selectedNodeIds);
      const edgesToRemove = new Set(state.selectedEdgeIds);
      const nextNodes = state.nodes.filter((node) => !nodesToRemove.has(node.id));
      const nextEdges = state.edges.filter(
        (edge) =>
          !edgesToRemove.has(edge.id) &&
          !nodesToRemove.has(edge.source) &&
          !nodesToRemove.has(edge.target)
      );

      return {
        nodes: nextNodes,
        edges: normalizeEdges(nextNodes, nextEdges),
        selectedNodeIds: [],
        selectedEdgeIds: [],
        historyPast: pushHistory(state.historyPast, getSnapshot(state)),
        historyFuture: [],
      };
    }),

  loadStack: () =>
    set((state) => {
      const nextNodes = createStackNodes();
      const nextEdges = normalizeEdges(nextNodes, createStackEdges());

      return {
        nodes: nextNodes,
        edges: nextEdges,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        historyPast: pushHistory(state.historyPast, getSnapshot(state)),
        historyFuture: [],
      };
    }),

  setNodeStatus: (nodeId, status, withHistory = true) =>
    set((state) => {
      const nextNodes = state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                status,
              },
            }
          : node
      );

      return {
        nodes: nextNodes,
        edges: normalizeEdges(nextNodes, state.edges),
        historyPast: withHistory ? pushHistory(state.historyPast, getSnapshot(state)) : state.historyPast,
        historyFuture: withHistory ? [] : state.historyFuture,
      };
    }),

  setNodeStatusByType: (nodeType, status) =>
    set((state) => {
      const nextNodes = state.nodes.map((node) =>
        node.data.nodeType === nodeType
          ? {
              ...node,
              data: {
                ...node.data,
                status,
              },
            }
          : node
      );

      return {
        nodes: nextNodes,
        edges: normalizeEdges(nextNodes, state.edges),
      };
    }),
}));

export const selectFlowSnapshot = (state: WorkflowStudioState): FlowSnapshot => ({
  nodes: state.nodes,
  edges: state.edges,
});
