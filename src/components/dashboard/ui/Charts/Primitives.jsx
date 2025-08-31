"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";

export function ChartCard({ title, subtitle, children, right }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{subtitle}</div>
          <div className="text-lg font-semibold">{title}</div>
        </div>
        {right}
      </div>
      <div className="mt-3 h-[260px]">{children}</div>
    </div>
  );
}

export function LineTrend({ data, x="label", y="value" }) {
  return (
    <ResponsiveContainer>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={x} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={y} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarTrend({ data, x="label", y="value" }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={x} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={y} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({ data, x="label", y="value" }) {
  return (
    <ResponsiveContainer>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopOpacity={0.35}/>
            <stop offset="95%" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={x} />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey={y} fill="url(#g1)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, name="name", value="value" }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey={value} nameKey={name} innerRadius={60} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
