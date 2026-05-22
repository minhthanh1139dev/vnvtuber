const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildPaginator, buildPaginationMeta } = require("../../src/utils/queryOptions");

describe("utils/queryOptions", () => {
  it("buildPaginator defaults page=1 limit=50", () => {
    const p = buildPaginator({});
    assert.equal(p.page, 1);
    assert.equal(p.limit, 50);
    assert.equal(p.skip, 0);
  });

  it("buildPaginator caps limit at MAX_PAGE_LIMIT", () => {
    const p = buildPaginator({ page: "2", limit: "9999" });
    assert.equal(p.page, 2);
    assert.equal(p.limit, 100);
    assert.equal(p.skip, 100);
  });

  it("buildPaginationMeta calculates totalPages", () => {
    const meta = buildPaginationMeta({ page: 1, limit: 50, total: 120 });
    assert.equal(meta.total, 120);
    assert.equal(meta.totalPages, 3);
  });
});
