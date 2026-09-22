// Shared helper for optional server-side pagination on list endpoints.
// Pagination only activates when BOTH page and pageSize are supplied in the query string,
// so existing callers that just want the full list (e.g. dropdown data) keep working unchanged.
function getPagination(query) {
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);

  if (!page || !pageSize || page < 1 || pageSize < 1) {
    return null;
  }

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize
  };
}

function toPagedResult(page, pageSize, count, rows) {
  return {
    items: rows,
    totalCount: count,
    page,
    pageSize
  };
}

module.exports = { getPagination, toPagedResult };
