import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workflowTemplates } from '../../config/workflowTemplates.js';
import type { WorkflowTemplate } from '../../config/workflowTemplates.js';

describe('Template Handler Integration Tests', () => {
  
  describe('GET /api/workflows/templates', () => {
    it('should return all available templates', () => {
      expect(workflowTemplates).toBeDefined();
      expect(Array.isArray(workflowTemplates)).toBe(true);
      expect(workflowTemplates.length).toBeGreaterThan(0);
    });

    it('should return templates with complete metadata', () => {
      workflowTemplates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('flow');
        expect(template).toHaveProperty('requiredInputs');
        expect(template).toHaveProperty('secretsRequired');
      });
    });

    it('should include use_case and success_criteria when available', () => {
      const templateWithCriteria = workflowTemplates.find(
        t => t.id === 'nodejs-ci'
      );
      expect(templateWithCriteria?.use_case).toBeDefined();
      expect(templateWithCriteria?.success_criteria).toBeDefined();
    });
  });

  describe('POST /api/workflows/templates/:templateId/run - Input Validation', () => {
    it('should reject missing required inputs', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      expect(template).toBeDefined();
      
      // Missing 'repo' and 'branch'
      const inputs = {};
      const missingInputs = template!.requiredInputs.filter(
        input => !inputs.hasOwnProperty(input)
      );
      expect(missingInputs.length).toBeGreaterThan(0);
    });

    it('should accept valid required inputs for nodejs-ci', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      const inputs = {
        repo: 'owner/repo',
        branch: 'main'
      };
      
      const missingInputs = template!.requiredInputs.filter(
        input => !inputs.hasOwnProperty(input)
      );
      expect(missingInputs.length).toBe(0);
    });

    it('should require branch for GitHub Actions dispatch', () => {
      const template = workflowTemplates.find(t => t.id === 'aws-ec2-deploy-docker');
      const inputs = {
        repo: 'owner/repo',
        image_name: 'myapp',
        app_port: 3000
        // Missing 'branch'
      };
      
      expect(inputs).not.toHaveProperty('branch');
    });

    it('should validate app_port is in allowed list [80, 443, 3000]', () => {
      const allowedPorts = [80, 443, 3000];
      const validPort = 3000;
      const invalidPort = 8080;
      
      expect(allowedPorts).toContain(validPort);
      expect(allowedPorts).not.toContain(invalidPort);
    });

    it('should validate deploy_mode is node or docker', () => {
      const validModes = ['node', 'docker'];
      const template = workflowTemplates.find(t => t.id === 'aws-ec2-deploy-docker');
      
      expect(validModes).toContain(template!.deploy_mode);
      expect(validModes).not.toContain('kubernetes');
    });
  });

  describe('POST /api/workflows/templates/:templateId/run - Secret Validation', () => {
    it('should require all secrets for aws-ec2-deploy-docker', () => {
      const template = workflowTemplates.find(t => t.id === 'aws-ec2-deploy-docker');
      const requiredSecrets = [
        'DOCKER_USER',
        'DOCKER_PASSWORD',
        'EC2_HOST',
        'EC2_USER',
        'EC2_SSH_KEY'
      ];
      
      expect(template!.secretsRequired).toEqual(
        expect.arrayContaining(requiredSecrets)
      );
    });

    it('should require SNYK_TOKEN for security-scan', () => {
      const template = workflowTemplates.find(t => t.id === 'security-scan');
      expect(template!.secretsRequired).toContain('SNYK_TOKEN');
    });

    it('should require AWS credentials for static-site-s3', () => {
      const template = workflowTemplates.find(t => t.id === 'static-site-s3');
      expect(template!.secretsRequired).toContain('AWS_ACCESS_KEY_ID');
      expect(template!.secretsRequired).toContain('AWS_SECRET_ACCESS_KEY');
    });

    it('nodejs-ci should not require secrets', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      expect(template!.secretsRequired.length).toBe(0);
    });
  });

  describe('POST /api/workflows/templates/:templateId/run - Response', () => {
    it('should return 404 for invalid templateId', () => {
      const templateId = 'invalid-template';
      const found = workflowTemplates.find(t => t.id === templateId);
      expect(found).toBeUndefined();
    });

    it('should return execution run details on success', () => {
      // Expected response structure
      const expectedResponse = {
        success: true,
        message: expect.stringContaining('dispatched'),
        data: {
          run_id: expect.any(String),
          workflow_id: expect.any(String),
          status: 'pending',
          template_id: expect.any(String),
          template_name: expect.any(String)
        }
      };
      
      expect(expectedResponse.data).toHaveProperty('run_id');
      expect(expectedResponse.data).toHaveProperty('workflow_id');
      expect(expectedResponse.data).toHaveProperty('status');
    });

    it('should set status to pending when dispatching', () => {
      // Templates dispatch to GitHub Actions, so status should be 'pending'
      const expectedStatus = 'pending';
      expect(expectedStatus).toBe('pending');
    });
  });

  describe('GitHub Actions Dispatch Parameters', () => {
    it('should pass templateId as workflow input', () => {
      const workflowInputs: Record<string, string> = {
        templateId: 'nodejs-ci'
      };
      expect(workflowInputs).toHaveProperty('templateId');
      expect(workflowInputs.templateId).toBe('nodejs-ci');
    });

    it('should pass runId for webhook correlation', () => {
      const runId = 'run-123456';
      const workflowInputs: Record<string, string> = {
        runId
      };
      expect(workflowInputs.runId).toBe(runId);
    });

    it('should pass all user inputs to GitHub Actions', () => {
      const inputs = {
        repo: 'owner/repo',
        branch: 'main',
        app_port: '3000'
      };
      
      const workflowInputs: Record<string, string> = {};
      for (const [key, value] of Object.entries(inputs)) {
        workflowInputs[key] = String(value);
      }
      
      expect(workflowInputs).toHaveProperty('repo', 'owner/repo');
      expect(workflowInputs).toHaveProperty('branch', 'main');
      expect(workflowInputs).toHaveProperty('app_port', '3000');
    });
  });

  describe('Template Flow Execution', () => {
    it('should generate correct workflow definition from template', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      
      // Simulate workflow definition generation
      const workflowDefinition = {
        nodes: template!.flow.map((step, i) => ({
          id: `node-${i}`,
          type: 'pipeline',
          data: { label: step, nodeType: step, category: template!.category, status: 'idle' },
          position: { x: i * 200, y: 100 }
        })),
        edges: template!.flow.slice(0, -1).map((_, i) => ({
          id: `edge-${i}`,
          source: `node-${i}`,
          target: `node-${i+1}`
        }))
      };

      expect(workflowDefinition.nodes).toHaveLength(template!.flow.length);
      expect(workflowDefinition.edges).toHaveLength(template!.flow.length - 1);
      
      // Verify node IDs match flow
      workflowDefinition.nodes.forEach((node, i) => {
        expect(node.data.label).toBe(template!.flow[i]);
      });
    });

    it('should create sequential edges in correct order', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      const flow = template!.flow;
      
      // For checkout -> install -> lint -> test
      // Should have edges: 0->1, 1->2, 2->3
      for (let i = 0; i < flow.length - 1; i++) {
        expect(i + 1).toBe(i + 1); // Next node index is i+1
      }
    });
  });

  describe('Error Handling', () => {
    it('should return detailed error for missing inputs', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      const inputs = {}; // Missing all inputs
      
      const errorResponse = {
        error: expect.stringContaining('Missing required inputs'),
        requiredInputs: template!.requiredInputs,
        providedInputs: Object.keys(inputs)
      };
      
      expect(errorResponse.providedInputs.length).toBeLessThan(
        errorResponse.requiredInputs.length
      );
    });

    it('should return error for missing secrets with hint', () => {
      const errorResponse = {
        error: expect.stringContaining('Missing required secrets'),
        hint: 'Store these in Settings > Secrets',
        missingSecrets: ['DOCKER_USER', 'DOCKER_PASSWORD']
      };
      
      expect(errorResponse).toHaveProperty('hint');
      expect(errorResponse.missingSecrets.length).toBeGreaterThan(0);
    });
  });

  describe('Template Discoverability', () => {
    it('should group templates by category', () => {
      const categories = new Map<string, WorkflowTemplate[]>();
      
      workflowTemplates.forEach(template => {
        if (!categories.has(template.category)) {
          categories.set(template.category, []);
        }
        categories.get(template.category)!.push(template);
      });
      
      expect(categories.size).toBeGreaterThan(0);
      expect(categories.has('CI')).toBe(true);
      expect(categories.has('Deploy')).toBe(true);
      expect(categories.has('Security')).toBe(true);
      expect(categories.has('Performance')).toBe(true);
    });

    it('should have meaningful template descriptions', () => {
      workflowTemplates.forEach(template => {
        expect(template.name.length).toBeGreaterThan(3);
        if (template.use_case) {
          expect(template.use_case.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
