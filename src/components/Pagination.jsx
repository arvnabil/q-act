import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination component.
 * @param {number} page - current page (1-indexed)
 * @param {number} totalPages - total number of pages
 * @param {number} totalItems - total number of items
 * @param {number} pageSize - items per page
 * @param {function} onPageChange - callback(newPage)
 * @param {string} itemLabel - label for items e.g. "produk", "customer"
 */
export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, itemLabel = 'data' }) {
  if (totalItems === 0) return null;

  const start = Math.min((page - 1) * pageSize + 1, totalItems);
  const end = Math.min(page * pageSize, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-5 py-3.5 bg-white border border-surface-200 rounded-xl mt-3">
      <span className="text-xs text-surface-400 font-medium">
        Menampilkan{' '}
        <span className="font-bold text-surface-600">{start}–{end}</span>{' '}
        dari{' '}
        <span className="font-bold text-surface-600">{totalItems}</span>{' '}
        {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 text-surface-400 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {totalPages > 1 && getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-surface-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                p === page
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'border border-surface-200 text-surface-500 hover:border-surface-400 hover:text-surface-700'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-200 text-surface-400 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
