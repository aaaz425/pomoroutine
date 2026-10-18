'use client';

import { JournalSearchField } from '@/components/journal/JournalSearchField';
import { JournalCategoryFilter } from '@/components/journal/JournalCategoryFilter';
import { JournalDateRangeFilter } from '@/components/journal/JournalDateRangeFilter';
import { Modal } from '@/components/shared/Modal';
import type { Category } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  searchQuery: string;
  selectedCategoryIds: Set<string>;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (ids: Set<string>) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
}

export function JournalFilterModal({
  open,
  onClose,
  categories,
  searchQuery,
  selectedCategoryIds,
  dateFrom,
  dateTo,
  onSearchChange,
  onCategoryChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: Props) {
  if (!open) return null;

  const hasActiveFilter = !!(searchQuery || selectedCategoryIds.size > 0 || dateFrom || dateTo);

  return (
    <Modal title="검색 · 필터" onClose={onClose} widthClassName="sm:w-[480px]">
      {hasActiveFilter && (
        <button
          onClick={onReset}
          className="self-end text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          초기화
        </button>
      )}

      <JournalSearchField value={searchQuery} onChange={onSearchChange} />

      <JournalCategoryFilter
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onChange={onCategoryChange}
      />

      <JournalDateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
    </Modal>
  );
}
