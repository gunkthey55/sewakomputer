import { forwardRef } from 'react';
import { cn } from '../utils/helpers';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  rowClassName?: (item: T) => string;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  selectable?: boolean;
}

function TableHeader<T>({ 
  columns, 
  sortBy, 
  sortOrder, 
  onSort,
  selectable,
  selectedKeys,
  onSelectionChange,
}: {
  columns: Column<T>[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}) {
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    // This would need the full data to work properly
  };

  return (
    <thead className="[&_tr]:border-b">
      <tr className="border-b transition-colors">
        {selectable && (
          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              checked={false}
              onChange={handleSelectAll}
            />
          </th>
        )}
        {columns.map((column) => (
          <th
            key={column.key}
            className={cn(
              'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
              column.sortable && 'cursor-pointer select-none hover:bg-muted',
              column.className
            )}
            style={{ width: column.width }}
            onClick={column.sortable ? () => onSort?.(column.key) : undefined}
          >
            <div className="flex items-center gap-1">
              {column.header}
              {column.sortable && sortBy === column.key && (
                sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody<T>({ 
  columns, 
  data, 
  keyExtractor, 
  onRowClick,
  rowClassName,
  selectable,
  selectedKeys,
  onSelectionChange,
  emptyMessage = 'No data available',
}: {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="[&_tr:last-child]:border-0">
      {data.map((item, index) => {
        const key = keyExtractor(item);
        const isSelected = selectedKeys?.has(key);
        
        return (
          <tr
            key={key}
            className={cn(
              'border-b transition-colors hover:bg-muted/50',
              isSelected && 'bg-muted',
              onRowClick && 'cursor-pointer',
              rowClassName?.(item)
            )}
            onClick={() => onRowClick?.(item)}
          >
            {selectable && (
              <td className="p-4 align-middle w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  checked={isSelected}
                  onChange={(e) => {
                    const newKeys = new Set(selectedKeys);
                    if (e.target.checked) {
                      newKeys.add(key);
                    } else {
                      newKeys.delete(key);
                    }
                    onSelectionChange?.(newKeys);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
            )}
            {columns.map((column) => (
              <td key={column.key} className={cn('p-4 align-middle', column.className)}>
                {column.render ? column.render(item, index) : String((item as Record<string, unknown>)[column.key] || '')}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  rowClassName,
  selectedKeys,
  onSelectionChange,
  selectable = false,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <TableHeader
          columns={columns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
          selectable={selectable}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
        />
        <TableBody
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          onRowClick={onRowClick}
          rowClassName={rowClassName}
          selectable={selectable}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          emptyMessage={emptyMessage}
        />
      </table>
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  showPageNumbers = true,
  maxPageNumbers = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const half = Math.floor(maxPageNumbers / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxPageNumbers - 1);

    if (end - start + 1 < maxPageNumbers) {
      start = Math.max(1, end - maxPageNumbers + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('ellipsis');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn btn-outline btn-sm"
        aria-label="Previous page"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {showPageNumbers && pageNumbers.map((page, index) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={cn(
              'btn btn-sm min-w-[40px]',
              currentPage === page ? 'btn-primary' : 'btn-outline'
            )}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn btn-outline btn-sm"
        aria-label="Next page"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}