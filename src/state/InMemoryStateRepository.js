import { StateRepository } from "./StateRepository.js";

export class InMemoryStateRepository extends StateRepository {
  constructor() {
    super();
    this.data = new Map();
  }

  get(applicationId) {
    return this.data.get(applicationId);
  }

  save(applicationId, state) {
    this.data.set(applicationId, state);
    return state;
  }

  exists(applicationId) {
    return this.data.has(applicationId);
  }

  all() {
    return [...this.data.values()];
  }
}
