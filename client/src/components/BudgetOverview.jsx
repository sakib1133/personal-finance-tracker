const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function BudgetOverview({ totalBudget, totalSpending, remainingBudget }) {
  const safeTotalBudget = toNumber(totalBudget);
  const safeTotalSpending = toNumber(totalSpending);
  const safeRemainingBudget = toNumber(remainingBudget);
  const percentageUsed = safeTotalBudget > 0 ? (safeTotalSpending / safeTotalBudget) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
        Budget Overview
      </h3>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center p-2 sm:p-3 bg-blue-50 rounded-lg">
          <span className="text-xs sm:text-sm font-medium text-blue-800">Total Monthly Budget</span>
          <span className="text-sm sm:text-lg font-bold text-blue-900">₹{safeTotalBudget.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center p-2 sm:p-3 bg-red-50 rounded-lg">
          <span className="text-xs sm:text-sm font-medium text-red-800">Total Monthly Spending</span>
          <span className="text-sm sm:text-lg font-bold text-red-900">₹{safeTotalSpending.toFixed(2)}</span>
        </div>

        <div className={`flex justify-between items-center p-2 sm:p-3 rounded-lg ${remainingBudget >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <span className={`text-xs sm:text-sm font-medium ${remainingBudget >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            Remaining Budget
          </span>
          <span className={`text-sm sm:text-lg font-bold ${safeRemainingBudget >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            ₹{safeRemainingBudget.toFixed(2)}
          </span>
        </div>

        <div className="mt-3 sm:mt-4">
          <div className="flex justify-between text-xs sm:text-sm mb-2">
            <span style={{ color: 'var(--text-secondary)' }}>Budget Used</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {percentageUsed.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div
              className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
                percentageUsed <= 70 ? 'bg-green-500' : percentageUsed <= 90 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
