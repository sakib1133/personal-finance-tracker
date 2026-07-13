import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CategoryBreakdownChart({ data }) {
  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
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
            tickFormatter={(value) => `₹${value}`}
            tick={{ fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px'
            }}
            formatter={(value, name) => [
              name === 'amount' ? (() => {
                const n = Number(value);
                const safe = Number.isFinite(n) ? n : 0;
                return `₹${safe.toFixed(2)}`;
              })() : `${value}%`,

              name === 'amount' ? 'Amount' : 'Percentage'
            ]}
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
