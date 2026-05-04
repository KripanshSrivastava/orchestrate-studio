import { z } from 'zod';

export const workflowNodeSchema = z.object({
  id: z.string().min(1, 'node id is required'),
  type: z.string().min(1, 'node type is required'),
  inputs: z.record(z.any()).optional(),
});

export const workflowEdgeSchema = z.object({
  from: z.string().min(1, 'edge.from is required'),
  to: z.string().min(1, 'edge.to is required'),
});

export const workflowSchema = z
  .object({
    nodes: z.array(workflowNodeSchema).min(1, 'at least one node is required'),
    edges: z.array(workflowEdgeSchema).default([]),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.nodes.forEach((node, index) => {
      if (seen.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate node id: ${node.id}`,
          path: ['nodes', index, 'id'],
        });
        return;
      }

      seen.add(node.id);
    });
  });

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
export type WorkflowGraph = z.infer<typeof workflowSchema>;

export const parseWorkflowPayload = (payload: unknown): WorkflowGraph => {
  return workflowSchema.parse(payload);
};
