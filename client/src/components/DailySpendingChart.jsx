import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailySpendingChart({ data }) {
  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="day" 
            stroke="#6b7280"
            fontSize={8}
            tickLine={false}
            interval="preserveStartEnd"
            tick={{ fontSize: 8 }}
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
            formatter={(value) => {
              const n = Number(value);
              const safe = Number.isFinite(n) ? n : 0;
              return `₹${safe.toFixed(2)}`;
            }}

          />
          <Bar 
            dataKey="amount" 
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
