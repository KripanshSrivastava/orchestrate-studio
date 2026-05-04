import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Square,
  ChevronRight,
  X,
  Settings,
  FileText,
  BarChart3,
  History,
  Cpu,
  Layers,
  Search,
  Trash2,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  BaseEdge,
  Connection,
  ConnectionLineType,
  Controls,
  EdgeChange,
  EdgeLabelRenderer,
  EdgeProps,
  Handle,
  MarkerType,
  MiniMap,
  NodeChange,
  NodeProps,
  Panel,
  PanOnScrollMode,
  Position,
  ReactFlowProvider,
  getSmoothStepPath,
  useReactFlow,
  useViewport,
} from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import { NodeToolbar } from "@reactflow/node-toolbar";
import "reactflow/dist/style.css";
import { nodeLibrary, nodeIconMap } from "@/data/nodeLibrary";
import useIntegrations from "@/hooks/useIntegrations";
import {
  ALIGN_TOLERANCE,
  AlignmentGuides,
  NODE_EXTENT,
  NODE_HEIGHT,
  NODE_WIDTH,
  SNAP_GRID,
  WorkflowEdge as WorkflowEdgeModel,
  WorkflowEdgeData,
  WorkflowNode as WorkflowNodeModel,
  WorkflowNodeMeta,
  NodeStatus,
  getNodeCenter,
  resolveCollision,
  useWorkflowStudioStore,
} from "@/stores/workflowStudioStore";

const statusColor: Record<NodeStatus, string> = {
  idle: "border-node-border",
  success: "border-success",
  running: "border-warning",
  failed: "border-destructive",
  blocked: "border-orange-500",
};

const statusGlow: Record<NodeStatus, string> = {
  idle: "",
  success: "shadow-success/20",
  running: "shadow-warning/20 animate-pulse",
  failed: "shadow-destructive/20",
  blocked: "shadow-orange-500/20",
};

const edgeLabelTone: Record<NodeStatus, string> = {
  idle: "border-border bg-card text-muted-foreground",
  success: "border-success/30 bg-success/10 text-success",
  running: "border-warning/30 bg-warning/10 text-warning",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  blocked: "border-orange-500/30 bg-orange-500/10 text-orange-500",
};

const PipelineNode = memo(({ id, data, selected }: NodeProps<WorkflowNodeMeta>) => {
  const setNodeStatus = useWorkflowStudioStore((state) => state.setNodeStatus);
  const deleteSelection = useWorkflowStudioStore((state) => state.deleteSelection);
  const Icon = nodeIconMap[data.icon] ?? nodeIconMap.source;

  return (
    <div
      className={`workflow-node h-full w-full min-w-[160px] border-2 transition-none will-change-transform ${statusColor[data.status]} ${statusGlow[data.status]} ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas" : ""
      }`}
      style={{ minWidth: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={NODE_WIDTH}
        minHeight={NODE_HEIGHT}
        maxWidth={460}
        maxHeight={220}
      />
      <NodeToolbar isVisible={selected} position={Position.Top} align="center">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/95 px-2 py-1 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() => setNodeStatus(id, "running")}
            className="rounded-full p-1.5 hover:bg-warning/15 text-warning transition-colors"
            title="Mark running"
            aria-label="Mark running"
          >
            <PlayCircle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setNodeStatus(id, "success")}
            className="rounded-full p-1.5 hover:bg-success/15 text-success transition-colors"
            title="Mark success"
            aria-label="Mark success"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setNodeStatus(id, "failed")}
            className="rounded-full p-1.5 hover:bg-destructive/15 text-destructive transition-colors"
            title="Mark failed"
            aria-label="Mark failed"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteSelection}
            className="rounded-full p-1.5 hover:bg-destructive/15 text-destructive transition-colors"
            title="Delete node"
            aria-label="Delete node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </NodeToolbar>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-primary !border-0" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{data.category}</p>
        </div>
        <span
          className={`status-dot ml-auto shrink-0 ${
            data.status === "success"
              ? "bg-success"
              : data.status === "running"
              ? "bg-warning animate-pulse"
              : data.status === "failed"
              ? "bg-destructive"
              : data.status === "blocked"
              ? "bg-orange-500"
              : "bg-muted-foreground/30"
          }`}
        />
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-primary !border-0" />
    </div>
  );
});

PipelineNode.displayName = "PipelineNode";

const WorkflowEdge = memo(
  ({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style, selected }: EdgeProps<WorkflowEdgeData>) => {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const status = data?.status ?? "idle";

    return (
      <>
        <BaseEdge
          path={path}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth: selected ? 3 : style?.strokeWidth ?? 2,
            strokeDasharray: status === "running" ? "8 4" : style?.strokeDasharray,
          }}
        />
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <div className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm ${edgeLabelTone[status]}`}>
              {status === "running"
                ? "Running"
                : status === "success"
                ? "Success"
                : status === "failed"
                ? "Error"
                : status === "blocked"
                ? "Blocked"
                : "Idle"}
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

WorkflowEdge.displayName = "WorkflowEdge";

const hasPath = (startId: string, targetId: string, edges: WorkflowEdgeModel[], seen = new Set<string>()): boolean => {
  if (startId === targetId) {
    return true;
  }

  if (seen.has(startId)) {
    return false;
  }

  seen.add(startId);

  return edges.filter((edge) => edge.source === startId).some((edge) => hasPath(edge.target, targetId, edges, seen));
};

function WorkflowStudioInner() {
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow();
  const viewport = useViewport();
  const nodes = useWorkflowStudioStore((state) => state.nodes);
  const edges = useWorkflowStudioStore((state) => state.edges);
  const selectedNodeIds = useWorkflowStudioStore((state) => state.selectedNodeIds);
  const selectedEdgeIds = useWorkflowStudioStore((state) => state.selectedEdgeIds);
  const historyPast = useWorkflowStudioStore((state) => state.historyPast);
  const historyFuture = useWorkflowStudioStore((state) => state.historyFuture);
  const setNodes = useWorkflowStudioStore((state) => state.setNodes);
  const setEdges = useWorkflowStudioStore((state) => state.setEdges);
  const setSelection = useWorkflowStudioStore((state) => state.setSelection);
  const clearSelection = useWorkflowStudioStore((state) => state.clearSelection);
  const commitSnapshot = useWorkflowStudioStore((state) => state.commitSnapshot);
  const undo = useWorkflowStudioStore((state) => state.undo);
  const redo = useWorkflowStudioStore((state) => state.redo);
  const deleteSelection = useWorkflowStudioStore((state) => state.deleteSelection);
  const loadStack = useWorkflowStudioStore((state) => state.loadStack);
  const setNodeStatus = useWorkflowStudioStore((state) => state.setNodeStatus);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides | null>(null);
  const [configTab, setConfigTab] = useState<"config" | "logs" | "metrics" | "history">("config");
  const [librarySearch, setLibrarySearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(nodeLibrary.map((category) => category.category)));
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const { getNodeIntegration } = useIntegrations();

  const selectedNode = useMemo(
    () => (selectedNodeIds.length === 1 ? nodes.find((node) => node.id === selectedNodeIds[0]) ?? null : null),
    [nodes, selectedNodeIds]
  );

  const selectedCount = selectedNodeIds.length + selectedEdgeIds.length;

  const runPipelineSimulation = useCallback(async () => {
    const orderedNodes = [...nodes].sort((left, right) => {
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.position.y - right.position.y;
    });

    for (const node of orderedNodes) {
      setNodeStatus(node.id, "running");
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      setNodeStatus(node.id, "success");
    }
  }, [nodes, setNodeStatus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping = tagName === "input" || tagName === "textarea" || target?.isContentEditable === true;

      if (isTyping) return;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedCount > 0) {
        event.preventDefault();
        deleteSelection();
        return;
      }

      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;

      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelection, redo, selectedCount, undo]);

  const nodeTypes = useMemo(() => ({ pipeline: PipelineNode }), []);
  const edgeTypes = useMemo(() => ({ workflow: WorkflowEdge }), []);
  const githubIntegration = getNodeIntegration("github");

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      if (getNodeCenter(sourceNode).x >= getNodeCenter(targetNode).x) {
        return false;
      }

      if (edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) {
        return false;
      }

      return !hasPath(connection.target, connection.source, edges);
    },
    [edges, nodes]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const shouldCommit = changes.some((change) => change.type === "add" || change.type === "remove");
      setNodes((current) => applyNodeChanges(changes, current), shouldCommit);
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const shouldCommit = changes.some((change) => change.type === "add" || change.type === "remove");
      setEdges((current) => applyEdgeChanges(changes, current), shouldCommit);
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(
        (current) =>
          addEdge(
            {
              ...connection,
              type: "workflow",
              animated: false,
              markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(187, 80%, 48%)" },
              style: { stroke: "hsl(187, 80%, 48%)", strokeWidth: 2, opacity: 0.65 },
              data: { status: "idle" },
            },
            current
          ),
        true
      );
    },
    [setEdges]
  );

  const onSidebarDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, payload: { type: string; label: string; icon: string; category: string }) => {
      event.dataTransfer.setData("application/reactflow", JSON.stringify(payload));
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw) return;

      const payload = JSON.parse(raw) as { type: string; label: string; icon: string; category: string };
      const bounds = flowWrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newNode: WorkflowNodeModel = {
        id,
        type: "pipeline",
        position,
        data: {
          nodeType: payload.type,
          label: payload.label,
          icon: payload.icon,
          category: payload.category,
          status: "idle",
        },
      };

      setNodes((current) => {
        const resolvedPosition = resolveCollision(position, current);
        return [...current, { ...newNode, position: resolvedPosition }];
      }, true);

      setSelection([id], []);
      setAlignmentGuides(null);
    },
    [screenToFlowPosition, setNodes, setSelection]
  );

  const onNodeDragStart = useCallback(() => {
    commitSnapshot();
  }, [commitSnapshot]);

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: WorkflowNodeModel) => {
      const nodeCenter = getNodeCenter(node);
      let closestX: number | undefined;
      let closestY: number | undefined;
      let bestXDiff = Number.POSITIVE_INFINITY;
      let bestYDiff = Number.POSITIVE_INFINITY;

      for (const candidate of nodes) {
        if (candidate.id === node.id) continue;
        const candidateCenter = getNodeCenter(candidate);
        const xDiff = Math.abs(candidateCenter.x - nodeCenter.x);
        const yDiff = Math.abs(candidateCenter.y - nodeCenter.y);

        if (xDiff < bestXDiff && xDiff <= ALIGN_TOLERANCE) {
          bestXDiff = xDiff;
          closestX = candidateCenter.x;
        }

        if (yDiff < bestYDiff && yDiff <= ALIGN_TOLERANCE) {
          bestYDiff = yDiff;
          closestY = candidateCenter.y;
        }
      }

      if (closestX === undefined && closestY === undefined) {
        setAlignmentGuides(null);
        return;
      }

      setAlignmentGuides({ x: closestX, y: closestY });

      const nextPosition = {
        x: closestX !== undefined ? closestX - NODE_WIDTH / 2 : node.position.x,
        y: closestY !== undefined ? closestY - NODE_HEIGHT / 2 : node.position.y,
      };

      setNodes(
        (current) =>
          current.map((currentNode) =>
            currentNode.id === node.id ? { ...currentNode, position: nextPosition } : currentNode
          )
      );
    },
    [nodes, setNodes]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: WorkflowNodeModel) => {
      setAlignmentGuides(null);
      setNodes(
        (current) => {
          const resolvedPosition = resolveCollision(node.position, current, node.id);
          if (resolvedPosition.x === node.position.x && resolvedPosition.y === node.position.y) {
            return current;
          }

          return current.map((currentNode) =>
            currentNode.id === node.id ? { ...currentNode, position: resolvedPosition } : currentNode
          );
        },
        true
      );
    },
    [setNodes]
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filteredLibrary = nodeLibrary
    .map((group) => ({
      ...group,
      nodes: group.nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(librarySearch.toLowerCase()) ||
          group.category.toLowerCase().includes(librarySearch.toLowerCase())
      ),
    }))
    .filter((group) => group.nodes.length > 0);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
      <div className="w-60 border-r border-border bg-card overflow-y-auto shrink-0">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Node Library</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Drag nodes to canvas</p>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search nodes..."
              className="w-full bg-secondary border-0 rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="p-2 space-y-1">
          {filteredLibrary.map((group) => (
            <div key={group.category}>
              <button
                onClick={() => toggleCategory(group.category)}
                className="flex items-center gap-1.5 px-2 py-1.5 w-full hover:bg-accent/30 rounded transition-colors"
              >
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCategories.has(group.category) ? "rotate-90" : ""}`} />
                <group.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.category}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/50">{group.nodes.length}</span>
              </button>
              {expandedCategories.has(group.category) && (
                <div className="space-y-0.5 ml-3">
                  {group.nodes.map((node) => {
                    const Icon = nodeIconMap[node.icon];
                    return (
                      <div
                        key={node.type}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-accent cursor-grab transition-colors"
                        draggable
                        onDragStart={(event) =>
                          onSidebarDragStart(event, {
                            type: node.type,
                            label: node.label,
                            icon: node.icon,
                            category: group.category,
                          })
                        }
                      >
                        <Icon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs">{node.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative flex flex-col">
        <div className="h-10 border-b border-border bg-card/60 backdrop-blur flex items-center px-4 gap-2">
          <span className="text-sm font-semibold text-foreground">DevOps Pipeline — Full Lifecycle</span>
          {githubIntegration?.state.verification?.repository && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[360px]">
              GitHub SDK: {githubIntegration.state.verification.repository.fullName} · {githubIntegration.state.verification.repository.defaultBranch}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={loadStack}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-info/15 text-info text-xs font-medium hover:bg-info/25 transition-colors"
          >
            Load Stack
          </button>
          <button
            onClick={runPipelineSimulation}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-success/15 text-success text-xs font-medium hover:bg-success/25 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Run Pipeline
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-destructive/15 text-destructive text-xs font-medium hover:bg-destructive/25 transition-colors">
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        </div>

        <div ref={flowWrapperRef} className="flex-1 workflow-canvas relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, node) => setSelection([node.id], [])}
            onEdgeClick={(_, edge) => setSelection([], [edge.id])}
            onPaneClick={() => {
              clearSelection();
              setAlignmentGuides(null);
            }}
            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
              setSelection(
                selectedNodes.map((node) => node.id),
                selectedEdges.map((edge) => edge.id)
              );
              setAlignmentGuides(null);
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.3}
            maxZoom={2}
            onlyRenderVisibleElements
            snapToGrid
            snapGrid={SNAP_GRID}
            nodeExtent={NODE_EXTENT}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: "workflow",
              markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(187, 80%, 48%)" },
              style: { stroke: "hsl(187, 80%, 48%)", strokeWidth: 2, opacity: 0.65 },
            }}
            isValidConnection={isValidConnection}
            panOnDrag={[1, 2]}
            panOnScroll
            panOnScrollMode={PanOnScrollMode.Free}
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick
            autoPanOnNodeDrag
            preventScrolling={false}
            selectionOnDrag
            proOptions={{ hideAttribution: true }}
            className="!bg-transparent"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(var(--border))" />
            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={3}
              nodeColor={() => "hsl(var(--node))"}
              maskColor="hsl(var(--background) / 0.5)"
              className="!bg-card !border !border-border"
            />
            <Controls className="!bg-card !border !border-border" />
            <Panel position="top-right" className="flex gap-2">
              <button
                onClick={deleteSelection}
                disabled={selectedCount === 0}
                className="px-2 py-1 text-xs rounded bg-card border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedCount > 1 ? `Delete Selected (${selectedCount})` : "Delete"}
              </button>
              <button
                onClick={undo}
                disabled={historyPast.length === 0}
                className="px-2 py-1 text-xs rounded bg-card border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={historyFuture.length === 0}
                className="px-2 py-1 text-xs rounded bg-card border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Redo
              </button>
            </Panel>
          </ReactFlow>

          {alignmentGuides?.x !== undefined && (
            <div
              className="absolute top-0 bottom-0 w-px bg-primary/60 pointer-events-none z-30"
              style={{ left: alignmentGuides.x * viewport.zoom + viewport.x }}
            />
          )}
          {alignmentGuides?.y !== undefined && (
            <div
              className="absolute left-0 right-0 h-px bg-primary/60 pointer-events-none z-30"
              style={{ top: alignmentGuides.y * viewport.zoom + viewport.y }}
            />
          )}
        </div>
      </div>

      {selectedNode && (
        <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0 animate-slide-in-left">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = nodeIconMap[selectedNode.data.icon];
                return <Icon className="w-4 h-4 text-primary" />;
              })()}
              <span className="text-sm font-semibold text-foreground">{selectedNode.data.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={deleteSelection}
                className="p-1 hover:bg-destructive/15 rounded transition-colors"
                aria-label="Delete node"
                title="Delete node"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
              <button onClick={clearSelection} className="p-1 hover:bg-accent rounded transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex border-b border-border">
            {([
              { key: "config", label: "Config", icon: Settings },
              { key: "logs", label: "Logs", icon: FileText },
              { key: "metrics", label: "Metrics", icon: BarChart3 },
              { key: "history", label: "History", icon: History },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setConfigTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  configTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {configTab === "config" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Node Type</label>
                  <p className="text-sm text-foreground mt-1 font-mono">{selectedNode.data.nodeType}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <p className="text-sm text-foreground mt-1">{selectedNode.data.category}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`status-dot ${
                        selectedNode.data.status === "success"
                          ? "bg-success"
                          : selectedNode.data.status === "running"
                          ? "bg-warning"
                          : selectedNode.data.status === "failed"
                          ? "bg-destructive"
                          : selectedNode.data.status === "blocked"
                          ? "bg-orange-500"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    <span className="text-sm capitalize text-foreground">{selectedNode.data.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Configuration URL</label>
                  <input
                    className="w-full bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Timeout (seconds)</label>
                  <input
                    type="number"
                    className="w-full bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="300"
                  />
                </div>

                {(() => {
                  const integration = getNodeIntegration(selectedNode.data.nodeType);
                  if (!integration) {
                    return null;
                  }

                  const configuredFields = integration.definition.fields.filter(
                    (field) => (integration.state.values[field.key] || "").trim().length > 0
                  ).length;

                  return (
                    <div className="rounded-md border border-border/60 bg-background/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Integration</p>
                        <span className={`text-[11px] font-medium ${integration.state.connected ? "text-success" : "text-warning"}`}>
                          {integration.state.connected ? "Connected" : "Not Connected"}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{integration.definition.name}</p>
                      <p className="text-xs text-muted-foreground">{integration.definition.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Configured fields: {configuredFields}/{integration.definition.fields.length}
                      </p>
                      <button
                        onClick={() => navigate("/settings")}
                        className="w-full mt-1 px-3 py-2 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                      >
                        Open Settings to Configure
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
            {configTab === "logs" && (
              <div className="font-mono text-xs space-y-1.5 bg-background/50 rounded-lg p-3 max-h-80 overflow-y-auto">
                <p className="text-success">[12:34:01] ✓ Connected to {selectedNode.data.label}</p>
                <p className="text-success">[12:34:02] ✓ Configuration loaded</p>
                <p className="text-info">[12:34:03] ℹ Starting execution...</p>
                <p className="text-muted-foreground">[12:34:05] Processing pipeline stage...</p>
                <p className="text-muted-foreground">[12:34:12] Running checks...</p>
                <p className="text-success">[12:34:18] ✓ All checks passed</p>
                <p className="text-warning">[12:34:19] ⚠ Minor warnings detected</p>
                <p className="text-success">[12:34:20] ✓ Stage complete</p>
              </div>
            )}
            {configTab === "metrics" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="w-3 h-3" /> Execution Time</span>
                  <span className="text-sm font-mono text-foreground">42s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Success Rate</span>
                  <span className="text-sm font-mono text-success">98.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Avg Duration</span>
                  <span className="text-sm font-mono text-foreground">38s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Runs (7d)</span>
                  <span className="text-sm font-mono text-foreground">156</span>
                </div>
              </div>
            )}
            {configTab === "history" && (
              <div className="space-y-2">
                {[
                  { time: "12:34", status: "success", commit: "a3f2c1d" },
                  { time: "11:20", status: "success", commit: "b8e4f2a" },
                  { time: "09:45", status: "failed", commit: "c1d3e5f" },
                  { time: "08:10", status: "success", commit: "d4f6a8b" },
                ].map((run, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                    <span className={`status-dot ${run.status === "success" ? "bg-success" : "bg-destructive"}`} />
                    <span className="text-xs text-muted-foreground">{run.time}</span>
                    <span className="text-xs font-mono text-foreground">{run.commit}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowStudio() {
  return (
    <ReactFlowProvider>
      <WorkflowStudioInner />
    </ReactFlowProvider>
  );
}
