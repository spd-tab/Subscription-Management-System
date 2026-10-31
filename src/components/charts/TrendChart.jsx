import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

export default function TrendChart({ data }) {
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 4, left: 2, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#82917f" stopOpacity={0.3} /><stop offset="100%" stopColor="#82917f" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#dde3da" strokeDasharray="4 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#444842', fontSize: 12 }} /><Tooltip formatter={(value) => [`$${value}k`, 'MRR']} /><Area type="monotone" dataKey="value" stroke="#111b12" strokeWidth={2.5} fill="url(#revenueFill)" /></AreaChart></ResponsiveContainer></div>
}
