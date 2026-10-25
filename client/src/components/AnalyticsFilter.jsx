import { useState } from 'react';
import { isDateRangeWithinLimit } from '../utils/dateRange';

export default function AnalyticsFilter({ onFilterChange }) {
  const [selectedFilter, setSelectedFilter] = useState('Last 30 Days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  const filters = ['Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'Custom'];

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const subtractMonths = (date, months) => {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() - months);
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    let startDate = new Date(endDate);

    switch (filter) {
      case 'Last 7 Days':
        startDate.setDate(startDate.getDate() - 6);
        break;
      case 'Last 30 Days':
        startDate.setDate(startDate.getDate() - 29);
        break;
      case 'Last 3 Months':
        subtractMonths(startDate, 3);
        break;
      case 'Last 6 Months':
        subtractMonths(startDate, 6);
        break;
      case 'Last 12 Months':
        subtractMonths(startDate, 12);
        break;
      case 'Custom':
        if (customStartDate && customEndDate) {
          if (customStartDate > customEndDate) {
            setDateError('Start date must be on or before end date');
            return;
          }
          if (!isDateRangeWithinLimit(customStartDate, customEndDate)) {
            setDateError('Date range cannot exceed 367 days');
            return;
          }
          setDateError('');
          onFilterChange({ startDate: customStartDate, endDate: customEndDate });
          return;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    setDateError('');
    onFilterChange({ startDate: formatDate(startDate), endDate: formatDate(endDate) });
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      handleFilterSelect('Custom');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterSelect(filter)}
              aria-pressed={selectedFilter === filter}
              style={{
                color: selectedFilter === filter ? '#ffffff' : '#374151',
                backgroundColor: selectedFilter === filter ? '#7c3aed' : '#f3f4f6',
                whiteSpace: 'nowrap'
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedFilter === filter
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{filter}</span>
            </button>
          ))}
        </div>

        {selectedFilter === 'Custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleCustomDateChange}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>
      {dateError && <p className="mt-3 text-sm text-red-600">{dateError}</p>}
    </div>
  );
}
