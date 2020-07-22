export type RuntimeMeta = {
  responseValidation: {
    hits: number;
    firstHit: boolean;
  }
  [key: string]: any;
}

type ActionStats = Map<string, RuntimeMeta>

export class ActionRuntimeMetaTracker {
  stats: ActionStats

  constructor() {
    this.stats = new Map<string, RuntimeMeta>()
  }

  getOrDefault(action: string): RuntimeMeta {
    if (!this.stats.has(action)) {
      this.stats.set(action, {
        responseValidation: {
          hits: 0,
          firstHit: false,
        }
      })
    }

    return this.stats.get(action) as RuntimeMeta
  }
}
