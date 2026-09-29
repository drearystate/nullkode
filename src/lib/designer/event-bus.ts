// Per-user pub/sub for SSE. Renderer subscribes via /api/designer/stream and
// gets a single channel that carries both agent events and file-changed
// events. We keep this in-process; one nullkode.service replica is fine. If
// we ever scale to multiple replicas, swap to Redis pub/sub here.

export type DesignerStreamEvent =
  | { channel: "files:changed"; designId: string }
  | { channel: "agent:event"; designId: string; payload: unknown }
  | { channel: "ask:request"; payload: unknown };

type Subscriber = (ev: DesignerStreamEvent) => void;

class Bus {
  private subs = new Map<string, Set<Subscriber>>();

  subscribe(userId: string, sub: Subscriber): () => void {
    let set = this.subs.get(userId);
    if (!set) {
      set = new Set();
      this.subs.set(userId, set);
    }
    set.add(sub);
    return () => {
      set!.delete(sub);
      if (set!.size === 0) this.subs.delete(userId);
    };
  }

  publish(userId: string, ev: DesignerStreamEvent): void {
    const set = this.subs.get(userId);
    if (!set) return;
    for (const sub of set) {
      try {
        sub(ev);
      } catch {}
    }
  }
}

// Persist across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __nullkodeDesignerBus: Bus | undefined;
}
export const bus: Bus = globalThis.__nullkodeDesignerBus ?? (globalThis.__nullkodeDesignerBus = new Bus());
