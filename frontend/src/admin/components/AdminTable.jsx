import { FiChevronLeft, FiChevronRight, FiInbox } from "react-icons/fi";

export function AdminTable({ columns, rows, loading, emptyMsg = "No records found." }) {
  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="ad-skeleton"
            style={{ height: 46, marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="ad-empty">
        <div className="ad-empty__icon"><FiInbox size={28} /></div>
        <p className="ad-empty__title">No Records</p>
        <p className="ad-empty__desc">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id || ri}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPagination({ page, pageSize, total, hasMore, onPage, loading }) {
  const totalPages = Math.ceil((total || 0) / (pageSize || 20)) || 1;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  return (
    <div className="ad-pagination">
      <span className="ad-pagination__info">
        {total === 0 ? "No results" : `${start}–${end} of ${total}`}
      </span>
      <div className="ad-pagination__controls">
        <button className="ad-page-btn"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}>
          <FiChevronLeft size={14} />
        </button>
        <button className="ad-page-btn ad-page-btn--active">{page}</button>
        <button className="ad-page-btn"
          disabled={!hasMore || loading}
          onClick={() => onPage(page + 1)}>
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}