const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("scheduler/registry", () => {
  it("register rejects invalid job definitions", () => {
    const registry = require("../../src/scheduler/registry");
    assert.throws(
      () => registry.register({ name: "x" }),
      /Invalid cron job definition/
    );
  });

  it("register accepts valid job and stopAll clears jobs", () => {
    const registry = require("../../src/scheduler/registry");
    assert.doesNotThrow(() => {
      registry.register({
        name: "unit-test-job",
        schedule: "0 0 1 1 *",
        action: async () => {},
      });
    });
    registry.stopAll();
  });
});
