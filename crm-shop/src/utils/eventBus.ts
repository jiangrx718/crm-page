type EventHandler = (data: any) => void;

class EventBus {
  private events: Record<string, EventHandler[]> = {};

  on(event: string, callback: EventHandler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventHandler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.events[event]) return;
    this.events[event].forEach(cb => cb(data));
  }
}

export const eventBus = new EventBus();
