const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  OK,
  CREATED,
  BAD_REQUEST,
  NOT_FOUND,
  ErrorResponse,
} = require("../../src/utils/response");

describe("utils/response", () => {
  it("OK builds success envelope with optional meta", () => {
    const res = new OK({ message: "ok", data: { id: 1 }, meta: { page: 1 } });
    assert.equal(res.status, "success");
    assert.equal(res.code, 200);
    assert.deepEqual(res.data, { id: 1 });
    assert.deepEqual(res.meta, { page: 1 });
  });

  it("CREATED uses 201 status code", () => {
    const res = new CREATED({ data: { created: true } });
    assert.equal(res.code, 201);
  });

  it("BAD_REQUEST is ErrorResponse with statusCode 400", () => {
    const err = new BAD_REQUEST({ message: "bad" });
    assert.ok(err instanceof ErrorResponse);
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, "bad");
  });

  it("NOT_FOUND uses 404", () => {
    const err = new NOT_FOUND({ message: "missing" });
    assert.equal(err.statusCode, 404);
  });
});
