export type WSCallback = (msg: any) => void;

export class SkillForgeSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private listeners: Set<WSCallback> = new Set();
  private reconnectTimer: any = null;

  constructor(token: string) {
    this.token = token;
    this.connect();
  }

  private connect() {
    const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws';
    const url = `${wsHost}?token=${encodeURIComponent(this.token)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('SkillForge WebSocket connected');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((callback) => callback(data));
      } catch (err) {
        console.error('Failed to parse WS payload:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('SkillForge WebSocket disconnected. Reconnecting in 3s...');
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.ws?.close();
    };
  }

  public subscribe(callback: WSCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
