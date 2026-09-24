export class RouteHeaderStore<State, Actions> {
  private readonly states = new Map<string, State>();
  private readonly handlers = new Map<string, Actions>();
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(private readonly fallback: State) {}

  state(id: string): State {
    return this.states.get(id) ?? this.fallback;
  }

  set(id: string, state: State): void {
    this.states.set(id, state);
    for (const listener of this.listeners.get(id) ?? []) listener();
  }

  subscribe(id: string, listener: () => void): () => void {
    const set = this.listeners.get(id) ?? new Set<() => void>();
    set.add(listener);
    this.listeners.set(id, set);
    return () => {
      set.delete(listener);
    };
  }

  bind(id: string, actions: Actions): () => void {
    this.handlers.set(id, actions);
    return () => {
      if (this.handlers.get(id) === actions) this.handlers.delete(id);
    };
  }

  actions(id: string): Actions | undefined {
    return this.handlers.get(id);
  }
}
