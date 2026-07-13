const toNumber = (value) => {
const parsed = Number(value);
return Number.isFinite(parsed) ? parsed : 0;
};

const safeToFixed = (value, decimals = 2) => {
const n = toNumber(value);
return n.toFixed(decimals);
};

export default function FinancialInsights({ data }) {
const d = data || {};

const insights = [
{
label: 'Total Expenses',
value: `₹${safeToFixed(d.totalExpenses, 2)}`,
color: 'bg-blue-500',
icon: '💰'
},
{
label: 'Average Expense',
value: `₹${safeToFixed(d.averageExpenseAmount, 2)}`,
color: 'bg-purple-500',
icon: '📊'
},
{
label: 'Highest Expense',
value: `₹${safeToFixed(d.highestSingleExpense, 2)}`,
color: 'bg-red-500',
icon: '📈'
},
{
label: 'Lowest Expense',
value: `₹${safeToFixed(d.lowestExpense, 2)}`,
color: 'bg-green-500',
icon: '📉'
},
{
label: 'Most Used Category',
value: d.mostUsedCategory || 'N/A',
color: 'bg-yellow-500',
icon: '🏷️'
},
{
label: 'Current Month',
value: `₹${safeToFixed(d.currentMonthSpending, 2)}`,
color: 'bg-indigo-500',
icon: '📅'
},
{
label: 'Previous Month',
value: `₹${safeToFixed(d.previousMonthSpending, 2)}`,
color: 'bg-pink-500',
icon: '📆'
}
];

return ( <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
{insights.map((insight, index) => ( <div
       key={index}
       className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
     > <div className="flex items-center justify-between"> <div> <p className="text-sm text-gray-500 mb-1">{insight.label}</p> <p className="text-2xl font-bold text-gray-800">{insight.value}</p> </div>
     
        <div className={`${insight.color} text-white text-3xl p-3 rounded-full`}>
          {insight.icon}
        </div>
      </div>
    </div>
  ))}
</div>

);
}
