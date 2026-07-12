const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function MonthlyComparison({ currentMonth, previousMonth }) {
  const safeCurrentMonth = toNumber(currentMonth);
  const safePreviousMonth = toNumber(previousMonth);
  const difference = safeCurrentMonth - safePreviousMonth;
  const percentage = safePreviousMonth > 0 ? ((difference / safePreviousMonth) * 100).toFixed(1) : 0;
  const isIncrease = difference > 0;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Comparison</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Current Month</span>
          <span className="text-xl font-bold text-gray-800">₹{safeCurrentMonth.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Previous Month</span>
          <span className="text-xl font-bold text-gray-800">₹{safePreviousMonth.toFixed(2)}</span>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Difference</span>
            <span className={`text-xl font-bold ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
              {isIncrease ? '+' : ''}₹{difference.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-600">Change</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                {isIncrease ? '↑' : '↓'} {Math.abs(percentage)}%
              </span>
              <span className={`text-sm px-2 py-1 rounded-full ${isIncrease ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isIncrease ? 'Increase' : 'Decrease'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
