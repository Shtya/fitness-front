"use client";


import { useState } from 'react';
import { Button, Input, Select, Textarea } from './UI';


export default function TrialModal({ open, onClose }){
const [form, setForm] = useState({ name:'', email:'', phone:'', program:'Gym Class', date:'', notes:'' });
function submit(e){
e.preventDefault();
// TODO: POST to /api/trials
console.log('Trial request', form);
onClose?.();
}
if (!open) return null;
return (
<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
<div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5">
<div className="text-lg font-semibold">Book a free trial</div>
<form onSubmit={submit} className="mt-3 space-y-3">
<Input placeholder="Full name" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} required />
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<Input type="email" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({ ...f, email:e.target.value }))} required />
<Input type="tel" placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({ ...f, phone:e.target.value }))} required />
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<Select value={form.program} onChange={e=>setForm(f=>({ ...f, program:e.target.value }))}>
<option>Gym Class</option>
<option>Personal Training</option>
<option>Online Coaching</option>
<option>Nutrition Coaching</option>
</Select>
<Input type="date" value={form.date} onChange={e=>setForm(f=>({ ...f, date:e.target.value }))} />
</div>
<Textarea rows={3} placeholder="Notes (goals, injuries, preferences)" value={form.notes} onChange={e=>setForm(f=>({ ...f, notes:e.target.value }))} />
<div className="flex items-center justify-end gap-2">
<Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
<Button type="submit">Send request</Button>
</div>
</form>
</div>
</div>
);
}