import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CategoryBreakdownChart({ data = [] }) {
  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={Array.isArray(data) ? data : []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="category"
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
            formatter={(value, name) => {
              if (name === 'amount') {
                const n = Number(value);
                const safe = Number.isFinite(n) ? n : 0;
                return [`₹${safe.toFixed(2)}`, 'Amount'];
              }

              const n = Number(value);
              const safe = Number.isFinite(n) ? n : 0;
              return [`${safe}%`, 'Percentage'];
            }}
          />

          <Bar
            dataKey="amount"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}