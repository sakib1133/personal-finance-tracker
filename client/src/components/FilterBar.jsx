import { useState } from 'react';

const CATEGORIES = ['All', 'Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
const DATE_RANGES = ['All Time', 'This Month', 'Last Month', 'Custom'];

export default function FilterBar({ onFilterChange, activeFilters }) {
  const [category, setCategory] = useState(activeFilters?.category || 'All');
  const [dateRange, setDateRange] = useState(activeFilters?.dateRange || 'All Time');
  const [startDate, setStartDate] = useState(activeFilters?.startDate || '');
  const [endDate, setEndDate] = useState(activeFilters?.endDate || '');

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    onFilterChange({
      category: newCategory,
      dateRange,
      startDate,
      endDate
    });
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
    onFilterChange({
      category,
      dateRange: newDateRange,
      startDate,
      endDate
    });
  };

  const handleCustomDateChange = () => {
    onFilterChange({
      category,
      dateRange: 'Custom',
      startDate,
      endDate
    });
  };

  return (
    <div className="shadow p-3 sm:p-4 mb-4 sm:mb-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '14px' }}>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
        <div className="w-full sm:flex-1">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Category
          </label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border focus:outline-none text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:flex-1">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="w-full px-3 py-2 border focus:outline-none text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
          >
            {DATE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </div>

        {dateRange === 'Custom' && (
          <>
            <div className="w-full sm:flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={handleCustomDateChange}
                className="w-full px-3 py-2 border focus:outline-none text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
              />
            </div>

            <div className="w-full sm:flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onBlur={handleCustomDateChange}
                className="w-full px-3 py-2 border focus:outline-none text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
