import React from 'react';

/**
 * A clickable <th> that shows sort direction indicators.
 *
 * @param {{ field: string, label: string, sortField: string, sortDir: string, onSort: function, className?: string }} props
 */
export default function SortableHeader({ field, label, sortField, sortDir, onSort, className = '' }) {
  const isActive = sortField === field;

  return (
    <th
      className={`table-header cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
      onClick={() => onSort(field)}
      role="columnheader"
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col text-xs leading-none">
          <span className={isActive && sortDir === 'asc' ? 'text-blue-600' : 'text-gray-300'}>▲</span>
          <span className={isActive && sortDir === 'desc' ? 'text-blue-600' : 'text-gray-300'}>▼</span>
        </span>
      </span>
    </th>
  );
}
