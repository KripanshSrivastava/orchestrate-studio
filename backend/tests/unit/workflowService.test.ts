import { describe, expect, it } from 'vitest';
import { parseWorkflowPayload } from '../../validators/workflowValidators.js';
import { compileWorkflowSteps, validateWorkflowDag } from '../../services/workflow/workflowService.js';

describe('workflowService', () => {
  it('rejects edges that reference missing nodes', () => {
    const graph = parseWorkflowPayload({
      nodes: [{ id: 'a', type: 'build' }],
      edges: [{ from: 'a', to: 'b' }],
    });

    expect(() => validateWorkflowDag(graph)).toThrow('Edge references missing node');
  });

  it('rejects cyclic workflows', () => {
    const graph = parseWorkflowPayload({
      nodes: [
        { id: 'a', type: 'build' },
        { id: 'b', type: 'test' },
        { id: 'c', type: 'deploy' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'b' },
      ],
    });

    expect(() => validateWorkflowDag(graph)).toThrow('Workflow graph contains a cycle');
  });

  it('rejects workflow without entry node', () => {
    const noEntryGraph = parseWorkflowPayload({
      nodes: [
        { id: 'a', type: 'build' },
        { id: 'b', type: 'test' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    });

    expect(() => validateWorkflowDag(noEntryGraph)).toThrow('Workflow graph has no entry node');
  });

  it('compiles ordered steps with dependencies', () => {
    const graph = parseWorkflowPayload({
      nodes: [
        { id: 'a', type: 'trigger', inputs: { branch: 'main' } },
        { id: 'b', type: 'build' },
        { id: 'c', type: 'deploy' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    });

    const steps = compileWorkflowSteps(graph);

    expect(steps.map((step) => step.id)).toEqual(['a', 'b', 'c']);
    expect(steps[1].dependsOn).toEqual(['a']);
    expect(steps[2].dependsOn).toEqual(['b']);
    expect(steps[0].inputs).toEqual({ branch: 'main' });
  });
});
