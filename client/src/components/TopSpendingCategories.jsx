export default function TopSpendingCategories({ data = [] }) {
  const topCategories = Array.isArray(data) ? data.slice(0, 5) : [];

  if (topCategories.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Top Spending Categories
        </h3>
        <p className="text-gray-500 text-center py-4">No data available</p>
      </div>
    );
  }

  const maxAmount = Math.max(
    ...topCategories.map(cat => Number(cat.amount) || 0)
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Top 5 Spending Categories
      </h3>

      <div className="space-y-4">
        {topCategories.map((category, index) => {
          const amount = Number(category.amount) || 0;
          const percentage = Number(category.percentage) || 0;

          return (
            <div key={category.category}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {index + 1}. {category.category}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-gray-800">
                    ₹{amount.toFixed(2)}
                  </span>

                  <span className="text-xs text-gray-500 ml-2">
                    ({percentage}%)
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${maxAmount > 0 ? (amount / maxAmount) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}