import React from "react";

export const KPI = React.memo(function({ title, value, icon: Icon }) {
  return (
    <div className='p-4 rounded-lg border border-slate-200 bg-white flex items-center gap-3'>
      <div className='w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center'>
        <Icon size={18} />
      </div>
      <div className='min-w-0'>
        <div className='text-xs text-slate-500'>{title}</div>
        <div className='text-base font-semibold tabular-nums truncate'>{value}</div>
      </div>
    </div>
  );
});

export const TopList = React.memo(function({ title, items, fmt }) {
  return (
    <div className='rounded-lg border border-slate-200 p-3'>
      <div className='font-medium mb-2'>{title}</div>
      <div className='space-y-1'>
        {items.map((x, i) => (
          <div key={i} className='flex items-center justify-between text-sm'>
            <span className='truncate text-slate-700'>{x.date}</span>
            <span className='tabular-nums font-semibold'>{fmt(x)}</span>
          </div>
        ))}
        {!items.length && <div className='text-sm text-slate-500'>No data.</div>}
      </div>
    </div>
  );
});
