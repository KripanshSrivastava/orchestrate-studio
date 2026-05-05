import { describe, it, expect, beforeEach } from 'vitest';
import { workflowTemplates } from '../../config/workflowTemplates.js';

describe('Workflow Templates Configuration', () => {
  
  describe('Template Structure', () => {
    it('should have all required templates', () => {
      expect(workflowTemplates.length).toBeGreaterThan(0);
      
      const expectedTemplateIds = [
        'nodejs-ci',
        'nodejs-ci-build',
        'aws-ec2-deploy-node',
        'aws-ec2-deploy-docker',
        'static-site-s3',
        'docker-image-only',
        'security-scan',
        'monorepo-service-build',
        'ec2-blue-green'
      ];
      
      const actualIds = workflowTemplates.map(t => t.id);
      expectedTemplateIds.forEach(id => {
        expect(actualIds).toContain(id);
      });
    });

    it('should have unique template IDs', () => {
      const ids = workflowTemplates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have required fields in each template', () => {
      workflowTemplates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.flow).toBeDefined();
        expect(Array.isArray(template.flow)).toBe(true);
        expect(template.requiredInputs).toBeDefined();
        expect(Array.isArray(template.requiredInputs)).toBe(true);
        expect(template.secretsRequired).toBeDefined();
        expect(Array.isArray(template.secretsRequired)).toBe(true);
      });
    });

    it('should have valid categories', () => {
      const validCategories = ['CI', 'Deploy', 'Security', 'Performance'];
      workflowTemplates.forEach(template => {
        expect(validCategories).toContain(template.category);
      });
    });

    it('should have valid deploy_mode values', () => {
      const validModes = ['node', 'docker'];
      workflowTemplates.forEach(template => {
        if (template.deploy_mode) {
          expect(validModes).toContain(template.deploy_mode);
        }
      });
    });
  });

  describe('Node.js Templates', () => {
    it('nodejs-ci should have required inputs: repo, branch', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      expect(template).toBeDefined();
      expect(template!.requiredInputs).toEqual(['repo', 'branch']);
      expect(template!.flow).toContain('checkout');
      expect(template!.flow).toContain('install');
      expect(template!.flow).toContain('test');
    });

    it('nodejs-ci-build should include build step', () => {
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci-build');
      expect(template).toBeDefined();
      expect(template!.flow).toContain('build');
      expect(template!.flow).toContain('artifact_upload');
      expect(template!.requiredInputs).toContain('repo');
      expect(template!.requiredInputs).toContain('branch');
    });
  });

  describe('EC2 Deployment Templates', () => {
    it('aws-ec2-deploy-node should require Node.js specific inputs', () => {
      const template = workflowTemplates.find(t => t.id === 'aws-ec2-deploy-node');
      expect(template).toBeDefined();
      expect(template!.deploy_mode).toBe('node');
      expect(template!.deploy_target).toBe('aws_ec2');
      expect(template!.requiredInputs).toContain('app_port');
      expect(template!.secretsRequired).toContain('EC2_HOST');
      expect(template!.secretsRequired).toContain('EC2_USER');
      expect(template!.secretsRequired).toContain('EC2_SSH_KEY');
    });

    it('aws-ec2-deploy-docker should require Docker and EC2 secrets', () => {
      const template = workflowTemplates.find(t => t.id === 'aws-ec2-deploy-docker');
      expect(template).toBeDefined();
      expect(template!.deploy_mode).toBe('docker');
      expect(template!.requiredInputs).toContain('image_name');
      expect(template!.requiredInputs).toContain('app_port');
      expect(template!.secretsRequired).toContain('DOCKER_USER');
      expect(template!.secretsRequired).toContain('DOCKER_PASSWORD');
      expect(template!.secretsRequired).toContain('EC2_HOST');
    });

    it('ec2-blue-green should support zero-downtime deployments', () => {
      const template = workflowTemplates.find(t => t.id === 'ec2-blue-green');
      expect(template).toBeDefined();
      expect(template!.flow).toContain('deploy_green');
      expect(template!.flow).toContain('switch_traffic');
      expect(template!.deploy_mode).toBe('docker');
    });
  });

  describe('S3 Deployment Template', () => {
    it('static-site-s3 should require AWS credentials and bucket', () => {
      const template = workflowTemplates.find(t => t.id === 'static-site-s3');
      expect(template).toBeDefined();
      expect(template!.requiredInputs).toContain('bucket_name');
      expect(template!.requiredInputs).toContain('region');
      expect(template!.secretsRequired).toContain('AWS_ACCESS_KEY_ID');
      expect(template!.secretsRequired).toContain('AWS_SECRET_ACCESS_KEY');
    });
  });

  describe('Docker Template', () => {
    it('docker-image-only should have minimal required inputs', () => {
      const template = workflowTemplates.find(t => t.id === 'docker-image-only');
      expect(template).toBeDefined();
      expect(template!.requiredInputs).toContain('repo');
      expect(template!.requiredInputs).toContain('branch');
      expect(template!.requiredInputs).toContain('image_name');
      expect(template!.secretsRequired).toContain('DOCKER_USER');
      expect(template!.secretsRequired).toContain('DOCKER_PASSWORD');
    });
  });

  describe('Security Template', () => {
    it('security-scan should have security-focused steps', () => {
      const template = workflowTemplates.find(t => t.id === 'security-scan');
      expect(template).toBeDefined();
      expect(template!.category).toBe('Security');
      expect(template!.flow).toContain('dependency_scan');
      expect(template!.flow).toContain('container_scan');
      expect(template!.secretsRequired).toContain('SNYK_TOKEN');
    });
  });

  describe('Monorepo Template', () => {
    it('monorepo-service-build should require service_path', () => {
      const template = workflowTemplates.find(t => t.id === 'monorepo-service-build');
      expect(template).toBeDefined();
      expect(template!.requiredInputs).toContain('service_path');
      expect(template!.requiredInputs).toContain('repo');
      expect(template!.requiredInputs).toContain('branch');
    });
  });

  describe('Workflow Steps', () => {
    it('should have valid step names', () => {
      const validSteps = [
        'checkout', 'install', 'lint', 'test', 'build', 'artifact_upload',
        'docker_build', 'docker_push', 'deploy_ec2', 'deploy_s3',
        'dependency_scan', 'container_scan', 'select_service', 'deploy_green', 'switch_traffic',
        'run_job', 'deploy', 'run_load_test', 'report', 'migrate_db'
      ];

      workflowTemplates.forEach(template => {
        template.flow.forEach(step => {
          expect(validSteps).toContain(step);
        });
      });
    });

    it('should have coherent step flow', () => {
      // checkout should come before install/test/build
      const template = workflowTemplates.find(t => t.id === 'nodejs-ci');
      const checkoutIdx = template!.flow.indexOf('checkout');
      const installIdx = template!.flow.indexOf('install');
      expect(checkoutIdx).toBeLessThan(installIdx);
    });
  });

  describe('Template Input Validation', () => {
    it('should not have duplicate required inputs', () => {
      workflowTemplates.forEach(template => {
        const inputs = template.requiredInputs;
        const uniqueInputs = new Set(inputs);
        expect(inputs.length).toBe(uniqueInputs.size);
      });
    });

    it('should not have duplicate secrets', () => {
      workflowTemplates.forEach(template => {
        const secrets = template.secretsRequired;
        const uniqueSecrets = new Set(secrets);
        expect(secrets.length).toBe(uniqueSecrets.size);
      });
    });
  });
});
