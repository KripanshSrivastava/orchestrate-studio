import { Request, Response } from 'express';
import http from 'http';
import https from 'https';

interface HealthCheckInput {
  host: string;
  port: number;
  protocol?: 'http' | 'https';
  timeout?: number;
}

const performHealthCheck = (input: HealthCheckInput): Promise<{ success: boolean; statusCode?: number; error?: string }> => {
  return new Promise((resolve) => {
    const protocol = input.protocol === 'https' ? https : http;
    const timeout = input.timeout || 5000;
    const url = `${input.protocol || 'http'}://${input.host}:${input.port}/`;

    const req = protocol.get(url, { timeout }, (res) => {
      resolve({
        success: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400,
        statusCode: res.statusCode,
      });
      res.on('data', () => {
        // Consume response data to free up memory
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Health check timeout' });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
};

export const verifyAppDeployment = async (req: Request, res: Response) => {
  try {
    const { host, port, protocol = 'http', timeout = 5000 } = req.body;

    // Validate inputs
    if (!host || !port) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: host, port'
      });
      return;
    }

    if (typeof port !== 'number' || port < 1 || port > 65535) {
      res.status(400).json({
        success: false,
        error: 'Invalid port number'
      });
      return;
    }

    if (!['http', 'https'].includes(protocol)) {
      res.status(400).json({
        success: false,
        error: 'Invalid protocol. Must be http or https'
      });
      return;
    }

    const result = await performHealthCheck({
      host,
      port,
      protocol: protocol as 'http' | 'https',
      timeout
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `App is healthy at ${protocol}://${host}:${port}`,
        statusCode: result.statusCode
      });
      return;
    } else {
      res.status(503).json({
        success: false,
        message: 'App is not responding',
        error: result.error
      });
      return;
    }

  } catch (error) {
    console.error('Error verifying app deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getAppHealthStatus = async (req: Request, res: Response) => {
  try {
    const { host, port, protocol = 'http' } = req.query;

    if (!host || !port) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameters: host, port'
      });
      return;
    }

    const portNum = Number(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      res.status(400).json({
        success: false,
        error: 'Invalid port number'
      });
      return;
    }

    const result = await performHealthCheck({
      host: String(host),
      port: portNum,
      protocol: protocol as 'http' | 'https'
    });

    res.status(result.success ? 200 : 503).json(result);

  } catch (error) {
    console.error('Error checking app health:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
