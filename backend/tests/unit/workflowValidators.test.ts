import { describe, expect, it } from 'vitest';
import { parseWorkflowPayload } from '../../validators/workflowValidators.js';

describe('workflowValidators', () => {
  it('accepts valid workflow with default edges', () => {
    const graph = parseWorkflowPayload({
      nodes: [{ id: 'a', type: 'build' }],
    });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toEqual([]);
  });

  it('rejects missing nodes array', () => {
    expect(() => parseWorkflowPayload({})).toThrow();
  });

  it('rejects duplicate node ids', () => {
    expect(() =>
      parseWorkflowPayload({
        nodes: [
          { id: 'a', type: 'build' },
          { id: 'a', type: 'test' },
        ],
        edges: [],
      })
    ).toThrow('Duplicate node id');
  });
});
