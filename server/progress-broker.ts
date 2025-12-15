import type { WebSocket } from 'ws';

export interface ProgressMessage {
  phase: string;
  total: number;
  processed: number;
  percent: number;
  message: string;
}

class ProgressBroker {
  private connections: Map<string, WebSocket[]> = new Map();

  register(sessionId: string, ws: WebSocket): void {
    const existing = this.connections.get(sessionId) || [];
    existing.push(ws);
    this.connections.set(sessionId, existing);
  }

  unregister(sessionId: string, ws: WebSocket): void {
    const existing = this.connections.get(sessionId);
    if (existing) {
      const filtered = existing.filter(conn => conn !== ws);
      if (filtered.length > 0) {
        this.connections.set(sessionId, filtered);
      } else {
        this.connections.delete(sessionId);
      }
    }
  }

  broadcast(sessionId: string, data: ProgressMessage): void {
    const connections = this.connections.get(sessionId);
    if (connections) {
      const message = JSON.stringify(data);
      connections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      });
    }
  }

  hasConnection(sessionId: string): boolean {
    const connections = this.connections.get(sessionId);
    return connections ? connections.length > 0 : false;
  }
}

export const progressBroker = new ProgressBroker();
