import type { WorkflowGraph } from '../../validators/workflowValidators.js';

export type WorkflowStep = {
  id: string;
  type: string;
  dependsOn: string[];
  inputs: Record<string, unknown>;
};

const buildAdjacency = (graph: WorkflowGraph) => {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const adjacency = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const deps = new Map<string, Set<string>>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, new Set());
    inDegree.set(node.id, 0);
    deps.set(node.id, new Set());
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(`Edge references missing node: ${edge.from} -> ${edge.to}`);
    }

    if (!adjacency.get(edge.from)?.has(edge.to)) {
      adjacency.get(edge.from)?.add(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      deps.get(edge.to)?.add(edge.from);
    }
  }

  return { adjacency, inDegree, deps };
};

const topoSort = (graph: WorkflowGraph) => {
  const { adjacency, inDegree, deps } = buildAdjacency(graph);
  const queue: string[] = [];

  for (const node of graph.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }

  if (queue.length === 0) {
    throw new Error('Workflow graph has no entry node');
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    order.push(current);

    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }

  if (order.length !== graph.nodes.length) {
    throw new Error('Workflow graph contains a cycle');
  }

  return { order, deps };
};

export const validateWorkflowDag = (graph: WorkflowGraph): WorkflowGraph => {
  topoSort(graph);
  return graph;
};

export const compileWorkflowSteps = (graph: WorkflowGraph): WorkflowStep[] => {
  const { order, deps } = topoSort(graph);
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

  return order.map((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Missing node for id: ${nodeId}`);
    }

    return {
      id: node.id,
      type: node.type,
      dependsOn: Array.from(deps.get(nodeId) ?? []),
      inputs: node.inputs ?? {},
    };
  });
};
