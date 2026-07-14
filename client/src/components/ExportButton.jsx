export default function ExportButton({ expenses }) {
  const exportToCSV = () => {
    if (expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    const headers = ['Serial No', 'Category', 'Amount', 'Date', 'Note', 'Time'];

    const rows = expenses.map((expense, index) => {
      const d = new Date(expense.date);

      const date = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const time = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const note = expense.note ? `"${expense.note}"` : '-';

      return [
        index + 1,
        expense.category,
        expense.amount,
        date,
        note,
        time
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportToCSV}
      className="text-white py-2 px-4 transition-colors flex items-center gap-2" style={{ backgroundColor: 'var(--secondary)', borderRadius: '8px' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      Export CSV
    </button>
  );
}
