import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

export interface TerraformModuleInput {
  id?: string;
  name: string;
  description?: string;
  code: string;
}

export interface TerraformRunContext {
  jobId: string;
  modules: TerraformModuleInput[];
  env?: Record<string, string | undefined>;
}

export interface TerraformRunResult {
  success: boolean;
  log: string;
  summary: {
    modules: number;
    command: string;
    exitCode?: number;
  };
}

const sanitizeName = (value: string): string => {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized || 'module';
};

const runCommand = (
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined> = {}
): Promise<{ code: number | null; output: string }> => {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
        TF_INPUT: '0',
        TF_IN_AUTOMATION: '1',
      },
      shell: process.platform === 'win32',
    });

    let output = `$ ${command} ${args.join(' ')}\n`;

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('error', (error) => {
      output += `\n${error.message}\n`;
      resolve({ code: 1, output });
    });

    child.on('close', (code) => {
      resolve({ code, output });
    });
  });
};

class TerraformRunnerService {
  private async createWorkspace(jobId: string, modules: TerraformModuleInput[]): Promise<string> {
    const workspace = await mkdtemp(join(tmpdir(), `idp-terraform-${sanitizeName(jobId)}-`));

    for (const [index, module] of modules.entries()) {
      const moduleDir = join(workspace, `${String(index + 1).padStart(2, '0')}-${sanitizeName(module.name)}`);
      await mkdir(moduleDir, { recursive: true });
      await writeFile(join(moduleDir, 'main.tf'), module.code || '', 'utf8');
    }

    return workspace;
  }

  private async runAcrossModules(
    context: TerraformRunContext,
    commands: Array<{ command: string; args: string[] }>
  ): Promise<TerraformRunResult> {
    const workspace = await this.createWorkspace(context.jobId, context.modules);
    let log = '';
    let exitCode = 0;

    try {
      for (const [index, module] of context.modules.entries()) {
        const moduleDir = join(workspace, `${String(index + 1).padStart(2, '0')}-${sanitizeName(module.name)}`);
        log += `\n\n## Module: ${module.name}\n`;

        for (const command of commands) {
          const result = await runCommand(command.command, command.args, moduleDir, context.env);
          log += `\n${result.output}`;

          if (result.code !== 0) {
            exitCode = result.code ?? 1;
            return {
              success: false,
              log,
              summary: {
                modules: context.modules.length,
                command: command.command,
                exitCode,
              },
            };
          }
        }
      }

      return {
        success: true,
        log,
        summary: {
          modules: context.modules.length,
          command: commands.map((command) => `${command.command} ${command.args.join(' ')}`).join(' && '),
          exitCode,
        },
      };
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  async plan(context: TerraformRunContext): Promise<TerraformRunResult> {
    return this.runAcrossModules(context, [
      { command: 'terraform', args: ['init', '-input=false'] },
      { command: 'terraform', args: ['fmt', '-check'] },
      { command: 'terraform', args: ['validate'] },
      { command: 'terraform', args: ['plan', '-input=false', '-no-color'] },
    ]);
  }

  async apply(context: TerraformRunContext): Promise<TerraformRunResult> {
    return this.runAcrossModules(context, [
      { command: 'terraform', args: ['init', '-input=false'] },
      { command: 'terraform', args: ['validate'] },
      { command: 'terraform', args: ['apply', '-input=false', '-auto-approve', '-no-color'] },
    ]);
  }
}

export default new TerraformRunnerService();
