import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MonthlyTrendChart({ data = [] }) {
return ( <div className="w-full h-64 sm:h-80"> <ResponsiveContainer width="100%" height="100%">
<LineChart data={Array.isArray(data) ? data : []}> <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="month"
        stroke="#6b7280"
        fontSize={10}
        tickLine={false}
        tick={{ fontSize: 10 }}
      />

      <YAxis
        stroke="#6b7280"
        fontSize={10}
        tickLine={false}
        tick={{ fontSize: 10 }}
        tickFormatter={(value) => {
          const n = Number(value);
          return `₹${Number.isFinite(n) ? n : 0}`;
        }}
      />

      <Tooltip
        contentStyle={{
          backgroundColor: '#1f2937',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '12px'
        }}
        formatter={(value) => {
          const n = Number(value);
          const safe = Number.isFinite(n) ? n : 0;
          return [`₹${safe.toFixed(2)}`, 'Amount'];
        }}
      />

      <Line
        type="monotone"
        dataKey="totalSpending"
        stroke="#8b5cf6"
        strokeWidth={2}
        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

);
}
