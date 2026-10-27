import type { Scope, State } from './engine.ts';

/** Test adapter ONLY: serializes competing commands. Not durable or multi-process safe. */
export class MemoryCampaignStore {
  #state: State;
  #tail: Promise<void> = Promise.resolve();
  constructor(state: State) { this.#state = structuredClone(state); }
  async transact(scope: Scope, update: (state: State) => State): Promise<State> {
    const operation = this.#tail.then(() => {
      if (scope.tenantId !== this.#state.config.tenantId || scope.campaignId !== this.#state.config.campaignId) throw new Error('Campaign scope mismatch');
      const proposed = update(structuredClone(this.#state));
      if (proposed.config.tenantId !== scope.tenantId || proposed.config.campaignId !== scope.campaignId) throw new Error('Transaction changed scope');
      this.#state = structuredClone(proposed);
      return structuredClone(this.#state);
    });
    this.#tail = operation.then(() => undefined, () => undefined);
    return operation;
  }
  async read(scope: Scope): Promise<State> { return this.transact(scope, s => s); }
}
