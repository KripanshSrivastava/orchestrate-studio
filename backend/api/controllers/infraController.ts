import { Request, Response } from 'express';
import { budgetProfiles } from '../../config/budgetProfiles.js';

export const getInfraOptions = (req: Request, res: Response) => {
  try {
    const tier = (req.query.tier as string) || 'basic';
    
    // Validate tier
    if (!(tier in budgetProfiles)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid tier specified' }
      });
      return;
    }
    
    const profile = budgetProfiles[tier as keyof typeof budgetProfiles];
    
    res.json({
      instance_types: profile.instances,
      disk_sizes: profile.disk,
      regions: profile.regions,
      allowed_ports: profile.ports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve infra options' }
    });
  }
};

import terraformRunnerService from '../../services/provisioning/terraformRunnerService.js';
import pool from '../../database/pool.js';
import { randomUUID } from 'crypto';

export const createEc2Instance = async (req: Request, res: Response) => {
  try {
    const { tier, region, instance_type, disk_size, app_port, key_pair_name, deploy_mode = 'docker' } = req.body;

    // Guardrail: Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      res.status(403).json({ error: 'AWS credentials not configured. Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY' });
      return;
    }

    // Validate inputs
    if (!(tier in budgetProfiles)) {
      res.status(400).json({ error: 'Invalid tier' });
      return;
    }
    const profile = budgetProfiles[tier as keyof typeof budgetProfiles];

    // Guardrail: Enforce tier constraints
    if (!profile.regions.includes('all') && !profile.regions.includes(region)) {
      res.status(400).json({ error: `Invalid region for ${tier} tier. Allowed: ${profile.regions.join(', ')}` });
      return;
    }
    if (!profile.instances.includes(instance_type)) {
      res.status(400).json({ error: `Invalid instance_type for ${tier} tier. Allowed: ${profile.instances.join(', ')}` });
      return;
    }
    if (!profile.disk.includes(disk_size)) {
      res.status(400).json({ error: `Invalid disk_size for ${tier} tier. Allowed: ${profile.disk.join(', ')} GB` });
      return;
    }
    if (!profile.ports.includes(app_port)) {
      res.status(400).json({ error: `Invalid app_port for ${tier} tier. Allowed: ${profile.ports.join(', ')}` });
      return;
    }

    const userDataScript = deploy_mode === 'node' 
      ? `#!/bin/bash
          apt-get update -y
          curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
          apt-get install -y nodejs
          node -v
        `
      : `#!/bin/bash
          apt-get update -y
          curl -fsSL https://get.docker.com -o get-docker.sh
          sh get-docker.sh
          usermod -aG docker ubuntu
          systemctl enable docker
          systemctl start docker
        `;

    // Prepare Terraform code
    const tfCode = `
      provider "aws" {
        region = "${region}"
      }

      data "aws_ami" "ubuntu" {
        most_recent = true
        filter {
          name   = "name"
          values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
        }
        filter {
          name   = "virtualization-type"
          values = ["hvm"]
        }
        owners = ["099720109477"] # Canonical
      }

      resource "aws_security_group" "web" {
        name_prefix = "idp-sg-"
        
        ingress {
          from_port   = 22
          to_port     = 22
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
        }

        ingress {
          from_port   = ${app_port}
          to_port     = ${app_port}
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
        }

        egress {
          from_port   = 0
          to_port     = 0
          protocol    = "-1"
          cidr_blocks = ["0.0.0.0/0"]
        }
      }

      resource "aws_instance" "web" {
        ami           = data.aws_ami.ubuntu.id
        instance_type = "${instance_type}"
        key_name      = "${key_pair_name || ''}"
        
        vpc_security_group_ids = [aws_security_group.web.id]

        root_block_device {
          volume_size = ${disk_size}
        }

        user_data = <<-EOF
${userDataScript}
        EOF

        tags = {
          Name = "idp-provisioned-ec2"
        }
      }

      output "public_ip" {
        value = aws_instance.web.public_ip
      }

      output "instance_id" {
        value = aws_instance.web.id
      }
    `;

    const jobId = randomUUID();
    
    // Run terraform
    const runContext = {
      jobId,
      modules: [
        {
          name: 'ec2_provision',
          code: tfCode
        }
      ]
    };

    const applyResult = await terraformRunnerService.apply(runContext);

    if (!applyResult.success) {
      console.error("Terraform apply failed:", applyResult.log);
      res.status(500).json({ error: 'Terraform apply failed', log: applyResult.log });
      return;
    }

    // Parse outputs
    const publicIpMatch = applyResult.log.match(/public_ip\s*=\s*"([^"]+)"/);
    const instanceIdMatch = applyResult.log.match(/instance_id\s*=\s*"([^"]+)"/);
    
    const public_ip = publicIpMatch ? publicIpMatch[1] : null;
    const instance_id = instanceIdMatch ? instanceIdMatch[1] : null;

    if (!public_ip) {
      // If no public IP, it might be mock or error
      console.warn("Could not parse public_ip from terraform log");
    }

    const project_id = req.body.project_id || 'default_project';

    await pool.query(
      `INSERT INTO ec2_instances 
        (project_id, instance_id, public_ip, region, instance_type, disk_size, app_port, ssh_user, status, deploy_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [project_id, instance_id, public_ip, region, instance_type, disk_size, app_port, 'ubuntu', 'running', deploy_mode]
    );

    res.json({
      success: true,
      public_ip,
      instance_id,
      message: 'EC2 instance provisioned successfully'
    });

  } catch (error) {
    console.error('Error creating EC2 instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjectInfra = async (req: Request, res: Response) => {
  try {
    const { id: project_id } = req.params;

    const result = await pool.query(
      `SELECT project_id, public_ip as ec2_public_ip, ssh_user, deploy_mode, app_port 
       FROM ec2_instances 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [project_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No infrastructure found for this project' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project infra:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const destroyEc2Instance = async (req: Request, res: Response) => {
  try {
    const { id: instanceId } = req.params;
    const { region } = req.body;

    if (!region) {
      res.status(400).json({ error: 'Region is required to destroy instance' });
      return;
    }

    // Guardrail: Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      res.status(403).json({ error: 'AWS credentials not configured' });
      return;
    }

    // Fetch instance from DB
    const result = await pool.query(
      `SELECT id, instance_id, project_id FROM ec2_instances WHERE id = $1`,
      [instanceId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }

    const instance = result.rows[0];

    // Prepare Terraform destroy code
    const tfCode = `
      provider "aws" {
        region = "${region}"
      }

      resource "aws_instance" "web" {
        id = "${instance.instance_id}"
      }

      resource "aws_security_group" "web" {
        id = "sg-placeholder"
      }
    `;

    const jobId = randomUUID();
    const runContext = {
      jobId,
      modules: [
        {
          name: 'ec2_destroy',
          code: tfCode
        }
      ]
    };

    const destroyResult = await terraformRunnerService.destroy(runContext);

    if (!destroyResult.success) {
      console.error('Terraform destroy failed:', destroyResult.log);
      res.status(500).json({ error: 'Terraform destroy failed', log: destroyResult.log });
      return;
    }

    // Update DB status to terminated
    await pool.query(
      `UPDATE ec2_instances SET status = $1 WHERE id = $2`,
      ['terminated', instanceId]
    );

    res.json({
      success: true,
      message: `EC2 instance ${instance.instance_id} terminated successfully`,
      instance_id: instance.instance_id
    });

  } catch (error) {
    console.error('Error destroying EC2 instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

