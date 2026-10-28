import { Button } from "@/components/ui/button";

export function EmployeeListPagination({ page, pageCount, first, last, total, isSearching, onPageChange }: Readonly<{
  page: number;
  pageCount: number;
  first: number;
  last: number;
  total: number;
  isSearching: boolean;
  onPageChange(page: number): void;
}>) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Phân trang nhân viên" aria-busy={isSearching} className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
      <p aria-live="polite" className="text-sm text-text-muted">
        Hiển thị {first} đến {last} / {total} nhân viên
      </p>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
        <Button variant="secondary" className="w-auto px-3 text-sm" disabled={isSearching || page === 1}
          onClick={() => onPageChange(page - 1)}>Trang trước</Button>
        <span className="text-sm text-text-muted">Trang {page} / {pageCount}</span>
        <Button variant="secondary" className="w-auto px-3 text-sm" disabled={isSearching || page === pageCount}
          onClick={() => onPageChange(page + 1)}>Trang sau</Button>
      </div>
    </nav>
  );
}
