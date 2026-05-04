import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

export type RuntimeNodeStatus = 'idle' | 'running' | 'success' | 'failed' | 'blocked';

export interface NodeStatusEventPayload {
  nodeId: string;
  status: RuntimeNodeStatus;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

let io: SocketIOServer | null = null;

export const initializeSocketServer = (httpServer: HttpServer, corsOrigins: string[]) => {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketServer = (): SocketIOServer | null => io;

export const emitPipelineCreated = (payload: Record<string, unknown>) => {
  io?.emit('pipeline:created', payload);
};

export const emitNodeStatusUpdate = (payload: NodeStatusEventPayload) => {
  io?.emit('node:status-update', payload);
};
