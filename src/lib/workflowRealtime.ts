import { io, Socket } from "socket.io-client";

export type RealtimeWorkflowStatus = "idle" | "running" | "success" | "failed" | "blocked";

export interface NodeStatusUpdateEvent {
  nodeId: string;
  status: RealtimeWorkflowStatus;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineCreatedEvent {
  pipelineId: string | null;
  repoName: string;
  branch: string;
  commitSha: string;
  committer: string;
  status: string;
  source: string;
  createdAt: string;
}

let socket: Socket | null = null;

const getRealtimeUrl = () => import.meta.env.VITE_API_URL || "http://localhost:3000";

export const getWorkflowRealtimeSocket = () => {
  if (socket) {
    return socket;
  }

  socket = io(getRealtimeUrl(), {
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
  });

  return socket;
};

export const disconnectWorkflowRealtimeSocket = () => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};
