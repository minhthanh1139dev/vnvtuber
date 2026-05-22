const { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } = require("../constants/app.constants");

function toInteger(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function buildPaginator(query = {}) {
  const page = Math.max(toInteger(query.page, 1), 1);
  const limit = Math.min(Math.max(toInteger(query.limit, DEFAULT_PAGE_LIMIT), 1), MAX_PAGE_LIMIT);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return { page, limit, total, totalPages };
}

module.exports = {
  buildPaginator,
  buildPaginationMeta,
};
