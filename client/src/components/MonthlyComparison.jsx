const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function MonthlyComparison({ currentPeriod, previousPeriod }) {
  const safeCurrentPeriod = toNumber(currentPeriod);
  const safePreviousPeriod = toNumber(previousPeriod);
  const difference = safeCurrentPeriod - safePreviousPeriod;
  const percentage = safePreviousPeriod > 0 ? ((difference / safePreviousPeriod) * 100).toFixed(1) : null;
  const isIncrease = difference > 0;
  const isDecrease = difference < 0;
  const changeLabel = isIncrease ? 'Increase' : isDecrease ? 'Decrease' : 'No change';
  const differenceColor = isIncrease
    ? 'text-red-500'
    : isDecrease
      ? 'text-green-500'
      : 'text-gray-500';
  const changeColor = isIncrease
    ? 'text-red-500'
    : isDecrease
      ? 'text-green-500'
      : 'text-gray-500';
  const changeBadgeColor = isIncrease
    ? 'bg-red-100 text-red-700'
    : isDecrease
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
  const changeIndicator = isIncrease ? '↑' : isDecrease ? '↓' : '→';

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Period Comparison</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Selected Period</span>
          <span className="text-xl font-bold text-gray-800">₹{safeCurrentPeriod.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Previous Period</span>
          <span className="text-xl font-bold text-gray-800">₹{safePreviousPeriod.toFixed(2)}</span>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Difference</span>
            <span className={`text-xl font-bold ${differenceColor}`}>
              {isIncrease ? '+' : ''}₹{difference.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-600">Change</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${changeColor}`}>
                {changeIndicator} {percentage === null ? (isIncrease ? 'N/A' : '0.0%') : `${Math.abs(percentage)}%`}
              </span>
              <span className={`text-sm px-2 py-1 rounded-full ${changeBadgeColor}`}>
                {safePreviousPeriod === 0 && isIncrease ? 'New spending' : changeLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
