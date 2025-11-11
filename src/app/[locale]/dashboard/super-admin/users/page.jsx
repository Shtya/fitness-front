'use client';

/* 
	Super Admin • Users (Light)
	- Stepper wizard to create Admin/Coach/Client
	- Client flow includes: workout plan + meal plan selection, subscription, WhatsApp creds
	- Admin/Coach flow: account only (+send creds)
	- Grouped tree view remains, with Actions in every header's arrow menu
*/

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Plus, Search, ChevronUp, ChevronDown, EyeOff, Shield, UserCircle2, Users,
	UserCog, UserCheck, Trash2, KeyRound, ChevronRight, LayoutGrid, Rows, Crown,
	CheckCircle2, XCircle, BadgeCheck, Dumbbell, Utensils, MessageCircle, Eye as EyeIcon, Sparkles, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import api from '@/utils/axios';
import DataTable from '@/components/dashboard/ui/DataTable';
import { Modal, StatCard } from '@/components/dashboard/ui/UI';
import Select from '@/components/atoms/Select';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import ActionsMenu from '@/components/molecules/ActionsMenu';
import { Notification } from '@/config/Notification';

/* ---------------------- tiny utils ---------------------- */
const toTitle = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const cls = (...xs) => xs.filter(Boolean).join(' ');

/* -------------------------------- Avatar -------------------------------- */
function Avatar({ name, email }) {
	const base = (name || email || '?')
		.split(' ')
		.map(x => x[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
	return (
		<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-[11px] font-semibold shadow-sm">
			{base}
		</div>
	);
}

/* ----------------------------- Pills / Status ---------------------------- */
function Pill({ children, color = 'slate', className }) {
	const map = {
		slate: 'bg-slate-100 text-slate-700 ring-slate-600/10',
		indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/10',
		emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-600/10',
		violet: 'bg-violet-100 text-violet-700 ring-violet-600/10',
		red: 'bg-rose-100 text-rose-700 ring-rose-600/10',
		amber: 'bg-amber-100 text-amber-800 ring-amber-600/10',
		sky: 'bg-sky-100 text-sky-700 ring-sky-600/10',
	};
	return (
		<span className={cls('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1', map[color] || map.slate, className)}>
			{children}
		</span>
	);
}
const RolePill = ({ role }) => {
	const r = String(role || '').toLowerCase();
	const color = r === 'admin' ? 'indigo' : r === 'coach' ? 'violet' : r === 'trainer' ? 'sky' : 'emerald';
	return (
		<Pill color={color} className="shadow-[inset_0_1px_0_0_rgba(255,255,255,.4)]">
			<Shield className="w-3 h-3" /> {toTitle(r)}
		</Pill>
	);
};
const StatusPill = ({ status }) => {
	const s = String(status || '').toLowerCase();
	const color = s === 'active' ? 'emerald' : s === 'suspended' ? 'red' : 'amber';
	const Icon = s === 'active' ? CheckCircle2 : s === 'suspended' ? XCircle : BadgeCheck;
	return (
		<Pill color={color}>
			<Icon className="w-3 h-3" /> {toTitle(s)}
		</Pill>
	);
};
function DaysLeftPill({ days }) {
	if (days == null) return <span className="text-slate-400">—</span>;
	const tone =
		days < 0 ? 'text-rose-700 bg-rose-50 ring-rose-200/60' :
			days <= 7 ? 'text-amber-700 bg-amber-50 ring-amber-200/60' :
				'text-emerald-700 bg-emerald-50 ring-emerald-200/60';
	return (
		<span className={cls('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1', tone)}>
			{days < 0 ? 'Expired' : `${days}d`}
		</span>
	);
}

/* ------------------------- Expand height animation ---------------------- */
function Expand({ open, children }) {
	const ref = useRef(null);
	const [h, setH] = useState(0);
	useEffect(() => {
		if (!ref.current) return;
		const el = ref.current;
		const measure = () => setH(open ? el.scrollHeight : 0);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [open, children]);
	return (
		<div style={{ height: h, transition: 'height 240ms cubic-bezier(.2,.8,.2,1)' }} className="overflow-hidden" aria-hidden={!open}>
			<div ref={ref}>{children}</div>
		</div>
	);
}

/* =============================== Stepper =============================== */
function Stepper({ step = 1, steps = 4 }) {
	const items = Array.from({ length: steps }, (_, i) => i + 1);
	return (
		<div dir="ltr" className="relative overflow-hidden">
			<div className="flex py-3 items-center justify-between gap-4 mb-4" role="progressbar" aria-valuemin={1} aria-valuemax={steps} aria-valuenow={step}>
				{items.map((idx) => {
					const isActive = step >= idx;
					return (
						<div key={idx} className="flex-1 relative">
							<div className="h-2.5 rounded-full bg-slate-200 overflow-hidden" />
							<motion.div
								className="absolute inset-0 h-2.5 origin-left rounded-full"
								style={isActive ? { background: 'linear-gradient(90deg, rgba(99,102,241,1) 0%, rgba(139,92,246,1) 100%)', boxShadow: '0 0 12px rgba(99,102,241,.55)' } : {}}
								initial={{ scaleX: 0, opacity: .4 }}
								animate={isActive ? { scaleX: 1, opacity: 1 } : { scaleX: 1, opacity: .25 }}
								transition={{ duration: .45, ease: 'easeOut' }}
							/>
							<AnimatePresence>
								{isActive && (
									<motion.div
										key={`shimmer-${idx}`}
										className="pointer-events-none absolute inset-0 h-2.5 rounded-full"
										initial={{ x: '-100%' }} animate={{ x: '100%' }} exit={{ opacity: 0 }}
										transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
										style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)' }}
									/>
								)}
							</AnimatePresence>
							<motion.div className="absolute -top-3 left-1/2 -translate-x-1/2" initial={{ y: 8, scale: .8, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
								<motion.div
									animate={isActive ? { scale: 1.06 } : { scale: 1 }}
									transition={{ type: 'spring', stiffness: 320, damping: 20 }}
									className={cls('h-7 w-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold',
										isActive ? 'text-white border-indigo-300 shadow-md' : 'text-slate-500 border-slate-300 bg-white')}
									style={isActive ? { background: 'linear-gradient(135deg, rgba(99,102,241,1), rgba(139,92,246,1))' } : {}}
								>
									{idx}
								</motion.div>
							</motion.div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/* ========================== Plan pickers (cards) ========================= */
function CardPickerGrid({ items = [], selectedId, setSelectedId, kind = 'plan' }) {
	return (
		<motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			{items.map((plan, i) => {
				const isSelected = selectedId === plan.id;
				return (
					<motion.button
						key={plan.id}
						layout
						type="button"
						onClick={() => setSelectedId(plan.id)}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.03, duration: 0.35, ease: 'easeOut' }}
						className={cls('group relative text-left rounded-lg border p-4 transition-all bg-white hover:bg-indigo-50/50',
							isSelected ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-200 hover:border-indigo-200')}
					>
						<div className="flex items-center gap-3">
							<CheckCircle2 className={cls('h-5 w-5 transition-colors', isSelected ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-300')} />
							<div className="flex-1 flex gap-2 items-center justify-between min-w-0">
								<div className="font-semibold text-slate-800 truncate">{plan.name || `${toTitle(kind)} #${plan.id}`}</div>
								<span className="flex-none inline-flex items-center gap-1 text-xs text-slate-600">
									<CalendarDays className="h-3.5 w-3.5" />
									{plan.daysCount != null ? `${plan.daysCount} days` : 'Plan'}
								</span>
							</div>
						</div>
					</motion.button>
				);
			})}
		</motion.div>
	);
}

/* ------------- Reusable modal that loads and assigns a plan ------------- */
function GenericPlanPickerModal({ open, onClose, title, icon: Icon, fetchUrl, assign, userId }) {
	const [items, setItems] = useState([]);
	const [selectedId, setSelectedId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [assigning, setAssigning] = useState(false);
	const [visible, setVisible] = useState(6);

	useEffect(() => {
		if (!open) return;
		setSelectedId(null);
		setVisible(6);
		(async () => {
			setLoading(true);
			try {
				const res = await api.get(fetchUrl, { params: { limit: 200 } });
				const raw = res?.data?.records || res?.data || [];
				const normalized = (Array.isArray(raw) ? raw : []).map((p) => ({
					id: p.id,
					name: p.name || p.title || `#${p.id}`,
					daysCount: (p.days || p.planDays || p.items || []).length || undefined,
				}));
				setItems(normalized);
			} catch {
				setItems([]);
			} finally {
				setLoading(false);
			}
		})();
	}, [open, fetchUrl]);

	const shown = items.slice(0, visible);
	const canMore = items.length > visible;

	const doAssign = async () => {
		if (!selectedId || !userId) return;
		setAssigning(true);
		try {
			await assign(selectedId, userId);
			Notification('Assigned successfully', 'success');
			onClose?.();
		} catch (e) {
			Notification(e?.response?.data?.message || 'Assign failed', 'error');
		} finally {
			setAssigning(false);
		}
	};

	return (
		<Modal open={open} onClose={onClose} title={title}>
			<div className="space-y-4">
				<div className="flex items-center gap-2 text-slate-600">
					{Icon ? <Icon className="w-4 h-4" /> : null}
					<span>Select one</span>
				</div>
				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />)}
					</div>
				) : (
					<>
						<CardPickerGrid items={shown} selectedId={selectedId} setSelectedId={setSelectedId} />
						{canMore && (
							<div className="flex justify-center">
								<Button name="See more" color="neutral" onClick={() => setVisible((v) => v + 6)} />
							</div>
						)}
					</>
				)}
				<div className="flex justify-end gap-2 pt-2">
					<Button color="neutral" name="Cancel" onClick={onClose} />
					<Button color="primary" name={assigning ? 'Assigning…' : 'Assign'} onClick={doAssign} disabled={!selectedId || assigning} />
				</div>
			</div>
		</Modal>
	);
}

/* ======================= Subscription period picker ====================== */
function formatISO(date, { representation = 'date' } = {}) {
	const d = new Date(date);
	if (representation === 'date') {
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	}
	return d.toISOString();
}
function parseISO(s) { return new Date(`${s}T00:00:00`); }
function addMonths(date, months, inclusiveMinusOneDay = false) {
	const d = new Date(date);
	const day = d.getDate();
	d.setMonth(d.getMonth() + months);
	if (d.getDate() < day) d.setDate(0);
	if (inclusiveMinusOneDay) d.setDate(d.getDate() - 1);
	return d;
}
function isBefore(a, b) { return a.getTime() < b.getTime(); }

function SubscriptionPeriodPicker({ startValue, endValue, onStartChange, onEndChange }) {
	const today = useMemo(() => formatISO(new Date(), { representation: 'date' }), []);
	const invalidRange = useMemo(() => {
		if (!startValue || !endValue) return false;
		return isBefore(parseISO(endValue), parseISO(startValue));
	}, [startValue, endValue]);

	const quick = (months) => {
		const start = startValue || today;
		onStartChange?.(start);
		const end = formatISO(addMonths(parseISO(start), months, true), { representation: 'date' });
		onEndChange?.(end);
	};

	return (
		<div className="mt-1">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<Input label="Start date" value={startValue} onChange={onStartChange} placeholder={today} />
				<Input label="End date" value={endValue} onChange={onEndChange} placeholder="YYYY-MM-DD" error={invalidRange ? 'End must be after start' : ''} />
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-2">
				{[1, 3, 6, 12].map((m) => (
					<button key={m} type="button" onClick={() => quick(m)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-indigo-50 hover:border-indigo-200">
						{m} mo
					</button>
				))}
			</div>
		</div>
	);
}

/* ============================ Create User Wizard =========================== */
function CreateUserWizard({ open, onClose, onCreated, admins = [], coaches = [] }) {
	// steps vary by role. Admin/Coach: account → send. Client: account → workout → meal → send
	const [step, setStep] = useState(1);
	const [role, setRole] = useState('client'); // 'admin' | 'coach' | 'client'
	const [form, setForm] = useState({
		name: '',
		email: '',
		phone: '',
		password: '',
		gender: null,                  // 'male' | 'female' | null
		membership: 'basic',           // clients only
		adminId: null,                 // for coach/client (owner admin)
		coachId: null,                 // for client
		subscriptionStart: '',
		subscriptionEnd: '',
	});
	const [saving, setSaving] = useState(false);
	const [createdUser, setCreatedUser] = useState(null);
	const [showPwd, setShowPwd] = useState(false);

	const [pickerWorkout, setPickerWorkout] = useState({ open: false, userId: null });
	const [pickerMeal, setPickerMeal] = useState({ open: false, userId: null });

	useEffect(() => {
		if (open) {
			setStep(1);
			setRole('client');
			setForm({
				name: '', email: '', phone: '', password: '',
				gender: null, membership: 'basic', adminId: null, coachId: null,
				subscriptionStart: '', subscriptionEnd: '',
			});
			setCreatedUser(null);
			setPickerWorkout({ open: false, userId: null });
			setPickerMeal({ open: false, userId: null });
			setShowPwd(false);
		}
	}, [open]);

	const adminOptions = admins.map(a => ({ id: a.id, label: a.name || a.email || a.id }));
	const coachOptions = coaches.map(c => ({ id: c.id, label: c.name || c.email || c.id }));

	const makePwd = () => {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
		let p = '';
		for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
		setForm(s => ({ ...s, password: p }));
		Notification('Password generated', 'info');
	};

	const createAccount = async () => {
		// basic validation
		if (!form.name || !form.email) return Notification('Name and email are required', 'error');
		if (role !== 'admin' && !form.adminId) return Notification('Please select Owner Admin', 'error');
		if (role === 'client') {
			if (!form.coachId) return Notification('Please select a coach', 'error');
			if (!form.subscriptionStart || !form.subscriptionEnd) return Notification('Please set subscription period', 'error');
		}
		setSaving(true);
		try {
			const body = {
				name: form.name.trim(),
				email: form.email.trim(),
				phone: form.phone?.trim() || undefined,
				password: form.password || undefined,
				role,
				adminId: role === 'admin' ? null : form.adminId,
				coachId: role === 'client' ? form.coachId : undefined,
				gender: form.gender ?? undefined,
				membership: role === 'client' ? form.membership : undefined,
				subscriptionStart: role === 'client' ? form.subscriptionStart : undefined,
				subscriptionEnd: role === 'client' ? form.subscriptionEnd : undefined,
			};
			const { data } = await api.post('/auth/admin/users', body);
			setCreatedUser(data);
			Notification('Account created', 'success');
			if (role === 'client') {
				setStep(2); // workout step
			} else {
				setStep(2); // send creds for admin/coach
			}
			onCreated?.(); // refresh lists on exit
		} catch (e) {
			Notification(e?.response?.data?.message || 'Create failed', 'error');
		} finally {
			setSaving(false);
		}
	};

	const stepsCount = role === 'client' ? 4 : 2;
	const title = role === 'client'
		? (step === 1 ? 'Create Client' : step === 2 ? 'Assign Exercise Plan' : step === 3 ? 'Assign Meal Plan' : 'Send Credentials')
		: (step === 1 ? `Create ${toTitle(role)}` : 'Send Credentials');

	const whatsappLink = (() => {
		const to = String(form.phone || '').replace(/[^0-9]/g, '');
		if (!to) return null;
		const url = (process.env.NEXT_PUBLIC_WEBSITE_URL ? `${process.env.NEXT_PUBLIC_WEBSITE_URL}/en/auth` : '');
		const lines = [
			'Your account is ready!',
			`• Email: ${form.email}`,
			form.password ? `• Password: ${form.password}` : '• Password: (sent to email / set by admin)',
			url ? `Login here: ${url}` : null
		].filter(Boolean).join('\n');
		return `https://wa.me/${to}?text=${encodeURIComponent(lines)}`;
	})();

	return (
		<>
			<Modal open={open} onClose={onClose} title={`New User • ${title}`}>
				<Stepper step={step} steps={stepsCount} />

				{/* STEP 1 — Account details */}
				{step === 1 && (
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<Input label="Full name" value={form.name} onChange={(v) => setForm(s => ({ ...s, name: v }))} />
							<Input label="Phone" value={form.phone} onChange={(v) => setForm(s => ({ ...s, phone: v }))} />
							<Input label="Email" value={form.email} onChange={(v) => setForm(s => ({ ...s, email: v }))} />
							<div className="relative">
								<Input label="Password" type={showPwd ? 'text' : 'password'} value={form.password} onChange={(v) => setForm(s => ({ ...s, password: v }))} placeholder="••••••••" />
								<div className="absolute rtl:left-2 ltr:right-2 top-9 flex items-center gap-1">
									<Button color="neutral" className=" !min-h-[30px] !px-2 !py-1 !text-xs rounded-lg" onClick={() => setShowPwd(v => !v)} name="" icon={showPwd ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />} />
									<Button color="neutral" className=" !min-h-[30px] !px-2 !py-1 !text-xs rounded-lg" onClick={makePwd} name="" icon={<Sparkles className="w-4 h-4" />} />
								</div>
							</div>

							<Select
								label="Role"
								value={role}
								onChange={(id) => { setRole(id); setStep(1); }}
								options={[
									{ id: 'admin', label: 'Admin' },
									{ id: 'coach', label: 'Coach' },
									{ id: 'client', label: 'Client' },
								]}
								icon={<Shield className="w-4 h-4" />}
							/>

							{/* Owner Admin for non-admin */}
							{role !== 'admin' && (
								<Select label="Owner Admin" value={form.adminId} onChange={(id) => setForm(s => ({ ...s, adminId: id }))} options={adminOptions} icon={<Crown className="w-4 h-4" />} />
							)}

							{/* Coach + membership + subscription for Client */}
							{role === 'client' && (
								<>
									<Select label="Coach" value={form.coachId} onChange={(id) => setForm(s => ({ ...s, coachId: id }))} options={coachOptions} icon={<UserCog className="w-4 h-4" />} />
									<Select
										label="Membership"
										value={form.membership}
										onChange={(id) => setForm(s => ({ ...s, membership: id }))}
										options={[
											{ id: 'basic', label: 'Basic' },
											{ id: 'gold', label: 'Gold' },
											{ id: 'platinum', label: 'Platinum' },
										]}
										icon={<BadgeCheck className="w-4 h-4" />}
									/>
									<div className="sm:col-span-2">
										<SubscriptionPeriodPicker
											startValue={form.subscriptionStart}
											endValue={form.subscriptionEnd}
											onStartChange={(v) => setForm(s => ({ ...s, subscriptionStart: v }))}
											onEndChange={(v) => setForm(s => ({ ...s, subscriptionEnd: v }))}
										/>
									</div>
								</>
							)}
						</div>

						<div className="flex justify-end gap-2 pt-4">
							<Button color="neutral" name="Cancel" onClick={onClose} />
							<Button color="primary" name={saving ? 'Creating…' : (role === 'client' ? 'Create & Next' : 'Create & Finish')} onClick={createAccount} />
						</div>
					</div>
				)}

				{/* STEP 2 — Workout (client only) OR Send (admin/coach) */}
				{step === 2 && role === 'client' && (
					<div className="space-y-3">
						<div className="rounded-lg border border-slate-200 p-3 bg-white">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-slate-700"><Dumbbell className="w-4 h-4" /> <span>Select exercise plan</span></div>
								<Button name="Browse plans" onClick={() => setPickerWorkout({ open: true, userId: createdUser?.id })} />
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button color="neutral" name="Back" onClick={() => setStep(1)} />
							<Button color="primary" name="Next" onClick={() => setStep(3)} />
						</div>
					</div>
				)}

				{/* STEP 3 — Meal (client only) */}
				{step === 3 && role === 'client' && (
					<div className="space-y-3">
						<div className="rounded-lg border border-slate-200 p-3 bg-white">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-slate-700"><Utensils className="w-4 h-4" /> <span>Select meal plan</span></div>
								<Button name="Browse meal plans" onClick={() => setPickerMeal({ open: true, userId: createdUser?.id })} />
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button color="neutral" name="Back" onClick={() => setStep(2)} />
							<Button color="primary" name="Next" onClick={() => setStep(4)} />
						</div>
					</div>
				)}

				{/* STEP 2 or 4 — Send credentials */}
				{((role !== 'client' && step === 2) || (role === 'client' && step === 4)) && (
					<div className="space-y-4">
						<p className="text-sm text-emerald-700/80">Credentials are ready to share.</p>
						<div className="grid gap-2">
							<div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
								<div className="text-sm"><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-800">{form.email}</span></div>
							</div>
							<div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
								<div className="text-sm"><span className="text-slate-500">Password:</span> <span className="font-medium text-slate-800">{form.password || 'sent to email / set by admin'}</span></div>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<Input label="WhatsApp phone" value={form.phone} onChange={(v) => setForm(s => ({ ...s, phone: v }))} placeholder="+1 202 555 0117" />
							<div className="sm:col-span-2 flex items-end justify-end gap-2">
								<Button
									color="green"
									className="!w-fit text-base"
									name="Send on WhatsApp"
									icon={<MessageCircle size={16} />}
									onClick={() => {
										if (!whatsappLink) return Notification('Enter a valid phone first', 'warning');
										window.open(whatsappLink, '_blank');
									}}
								/>
								<Button color="primary" name="Done" onClick={onClose} />
							</div>
						</div>
					</div>
				)}
			</Modal>

			{/* Workout picker */}
			<GenericPlanPickerModal
				open={pickerWorkout.open}
				onClose={() => setPickerWorkout({ open: false, userId: null })}
				title="Assign Workout Plan"
				icon={Dumbbell}
				fetchUrl="/plans"
				userId={pickerWorkout.userId}
				assign={async (planId, userId) => {
					await api.post(`/plans/${planId}/assign`, { athleteIds: [userId], confirm: 'yes', isActive: true });
				}}
			/>
			{/* Meal picker */}
			<GenericPlanPickerModal
				open={pickerMeal.open}
				onClose={() => setPickerMeal({ open: false, userId: null })}
				title="Assign Meal Plan"
				icon={Utensils}
				fetchUrl="/nutrition/meal-plans"
				userId={pickerMeal.userId}
				assign={async (planId, userId) => {
					await api.post(`/nutrition/meal-plans/${planId}/assign`, { userId });
				}}
			/>
		</>
	);
}

/* =================== Tree builder (admins → coaches → clients) =================== */
function buildTenantTreeFromOverview(items = []) {
	const admins = new Map();
	for (const it of items) {
		if (String(it.role).toLowerCase() === 'admin') {
			if (!admins.has(it.id)) {
				admins.set(it.id, { admin: it, coaches: new Map(), adminCoach: { clients: [] }, unassigned: [] });
			}
		}
	}
	const ensureAdminBucket = (adminId) => {
		if (!adminId) return null;
		if (!admins.has(adminId)) {
			admins.set(adminId, { admin: { id: adminId, name: 'Unknown Admin', email: '', role: 'admin', status: 'active' }, coaches: new Map(), adminCoach: { clients: [] }, unassigned: [] });
		}
		return admins.get(adminId);
	};
	for (const it of items) {
		if (String(it.role).toLowerCase() !== 'coach') continue;
		const bucket = ensureAdminBucket(it.adminId);
		if (!bucket) continue;
		if (!bucket.coaches.has(it.id)) bucket.coaches.set(it.id, { coach: it, clients: [] });
	}
	for (const it of items) {
		if (String(it.role).toLowerCase() !== 'client') continue;
		const bucket = ensureAdminBucket(it.adminId);
		if (!bucket) continue;
		const coachId = it.coachId || null;
		if (coachId && coachId === bucket.admin.id) { bucket.adminCoach.clients.push(it); continue; }
		if (coachId && bucket.coaches.has(coachId)) { bucket.coaches.get(coachId).clients.push(it); continue; }
		bucket.unassigned.push(it);
	}
	const byName = (a, b) => ((a.name || a.email || '').toLowerCase()).localeCompare((b.name || b.email || '').toLowerCase());
	const result = [];
	for (const [, bucket] of admins.entries()) {
		const coaches = Array.from(bucket.coaches.values()).map(c => ({ ...c, clients: [...c.clients].sort(byName) })).sort((a, b) => byName(a.coach, b.coach));
		result.push({ admin: bucket.admin, coaches, adminCoach: { coach: { id: `${bucket.admin.id}__self`, name: `${bucket.admin.name || 'Admin'} (Coach)`, email: bucket.admin.email, status: bucket.admin.status, role: 'coach', }, clients: bucket.adminCoach.clients.sort(byName) }, unassigned: bucket.unassigned.sort(byName) });
	}
	result.sort((a, b) => byName(a.admin, b.admin));
	return result;
}

/* ============================= Grouped Tree UI ============================= */
function GroupedTree({ rows, onSetStatus, onAssignCoach, onDelete, onImpersonate, loading }) {
	const [expandedAdmins, setExpandedAdmins] = useState({});
	const [expandedCoaches, setExpandedCoaches] = useState({});
	const tree = useMemo(() => buildTenantTreeFromOverview(rows), [rows]);


	const toggleAdmin = (id) => setExpandedAdmins(s => ({ ...s, [id]: !s[id] }));
	const toggleCoach = (id) => setExpandedCoaches(s => ({ ...s, [id]: !s[id] }));

	const AdminCard = ({ a }) => {
		const open = !!expandedAdmins[a.admin.id];
		const hasChildren = a.coaches.length > 0 || a.adminCoach.clients.length > 0 || a.unassigned.length > 0;
		const clientCount = a.coaches.reduce((acc, c) => acc + c.clients.length, 0) + a.adminCoach.clients.length + a.unassigned.length;

		const adminOpts = [
			String(a.admin.status).toLowerCase() !== 'active'
				? { label: 'Activate', onClick: () => onSetStatus(a.admin, 'active') }
				: { label: 'Suspend', onClick: () => onSetStatus(a.admin, 'suspended') },
			{ label: 'Impersonate', onClick: () => onImpersonate(a.admin) },
			{ label: 'Delete', className: 'text-rose-600', onClick: () => onDelete(a.admin) },
		];

		return (
			<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
				<div className="flex items-center justify-between px-4 py-3">
					<div className="flex items-center gap-3 min-w-0">
						{hasChildren ? (
							<button onClick={() => toggleAdmin(a.admin.id)} className="p-1.5 rounded hover:bg-slate-100">
								{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
							</button>
						) : <span className="w-6" />}
						<Avatar name={a.admin.name} email={a.admin.email} />
						<div className="min-w-0">
							<div className="truncate font-semibold text-slate-800">{a.admin.name || a.admin.email}</div>
							<div className="truncate text-xs text-slate-500">{a.admin.email}</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Pill color="indigo"><Crown className="w-3 h-3" /> Admin</Pill>
						<Pill>{a.coaches.length + (a.adminCoach.clients.length ? 1 : 0)} Coaches</Pill>
						<Pill>{clientCount} Clients</Pill>
						<StatusPill status={a.admin.status} />
						<ActionsMenu options={adminOpts} align="right" />
					</div>
				</div>

				{hasChildren && (
					<Expand open={open}>
						<div className="px-4 pb-4 space-y-3">
							{a.adminCoach.clients.length > 0 && (
								<CoachCard
									pseudo coach={a.adminCoach.coach} clients={a.adminCoach.clients}
									open={!!expandedCoaches[a.adminCoach.coach.id]}
									onToggle={() => toggleCoach(a.adminCoach.coach.id)}
									onSetStatus={onSetStatus}
									onAssignCoach={onAssignCoach}
									onDelete={onDelete}
									onImpersonate={() => onImpersonate(a.admin)}
								/>
							)}
							{a.coaches.length > 0 && (
								<div className="grid gap-3">
									{a.coaches.map(node => (
										<CoachCard
											key={node.coach.id}
											coach={node.coach}
											clients={node.clients}
											open={!!expandedCoaches[node.coach.id]}
											onToggle={() => toggleCoach(node.coach.id)}
											onSetStatus={onSetStatus}
											onAssignCoach={onAssignCoach}
											onDelete={onDelete}
											onImpersonate={() => onImpersonate(node.coach)}
										/>
									))}
								</div>
							)}
							{a.unassigned.length > 0 && (
								<div className="rounded-lg border border-slate-200 overflow-hidden">
									<div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 rounded-t-lg">
										<div className="flex items-center gap-2">
											<Users className="w-4 h-4 text-slate-600" />
											<span className="text-sm font-semibold text-slate-700">Unassigned clients</span>
										</div>
										<span className="text-xs text-slate-500">{a.unassigned.length} clients</span>
									</div>
									<div className="divide-y divide-slate-200">
										{a.unassigned.map(c => (
											<ClientRow key={c.id} c={c} onSetStatus={onSetStatus} onAssignCoach={onAssignCoach} onDelete={onDelete} />
										))}
									</div>
								</div>
							)}
						</div>
					</Expand>
				)}
			</div>
		);
	};

	const CoachCard = ({ coach, clients, open, onToggle, onSetStatus, onAssignCoach, onDelete, onImpersonate, pseudo = false }) => {
		const headerTitle = pseudo ? (coach.name || 'Admin (Coach)') : (coach.name || coach.email);
		const headerEmail = coach.email;
		const hasChildren = clients.length > 0;

		const coachOpts = [
			...(pseudo ? [] : [
				String(coach.status).toLowerCase() !== 'active'
					? { label: 'Activate', onClick: () => onSetStatus(coach, 'active') }
					: { label: 'Suspend', onClick: () => onSetStatus(coach, 'suspended') },
			]),
			{ label: 'Impersonate', onClick: onImpersonate },
			{ label: 'Delete', className: 'text-rose-600', onClick: () => onDelete(coach) },
		];

		return (
			<div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
				<div className="flex items-center justify-between px-3 py-2 bg-slate-50">
					<div className="flex items-center gap-3 min-w-0">
						{hasChildren ? (
							<button onClick={onToggle} className="p-1.5 rounded hover:bg-slate-100">
								{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
							</button>
						) : <span className="w-6" />}
						<Avatar name={headerTitle} email={headerEmail} />
						<div className="min-w-0">
							<div className="truncate font-medium text-slate-800">{headerTitle}</div>
							<div className="truncate text-xs text-slate-500">{headerEmail}</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Pill color={pseudo ? 'indigo' : 'slate'}>{pseudo ? 'Admin (Coach)' : 'Coach'}</Pill>
						{!pseudo && <StatusPill status={coach.status} />}
						<Pill>{clients.length} clients</Pill>
						<ActionsMenu options={coachOpts} align="right" />
					</div>
				</div>

				{hasChildren && (
					<Expand open={open}>
						<div className="divide-y divide-slate-200">
							{clients.map(c => (
								<ClientRow key={c.id} c={c} onSetStatus={onSetStatus} onAssignCoach={onAssignCoach} onDelete={onDelete} />
							))}
						</div>
					</Expand>
				)}
			</div>
		);
	};

	const ClientRow = ({ c, onSetStatus, onAssignCoach, onDelete }) => {
		const opts = [
			String(c.status).toLowerCase() !== 'active'
				? { label: 'Activate', onClick: () => onSetStatus(c, 'active') }
				: { label: 'Suspend', onClick: () => onSetStatus(c, 'suspended') },
			{ label: 'Assign coach', onClick: () => onAssignCoach(c) },
			{ label: 'Delete', className: 'text-rose-600', onClick: () => onDelete(c) },
		];
		return (
			<div className="grid grid-cols-12 items-center px-3 py-2 hover:bg-slate-50 transition">
				<div className="col-span-6 flex items-center gap-3 min-w-0">
					<Avatar name={c.name} email={c.email} />
					<div className="min-w-0">
						<div className="truncate font-medium text-slate-800">{c.name || c.email}</div>
						<div className="truncate text-xs text-slate-500">{c.email}</div>
					</div>
				</div>
				<div className="col-span-2"><RolePill role="client" /></div>
				<div className="col-span-2"><StatusPill status={c.status} /></div>
				<div className="col-span-2"><div className="flex justify-end"><ActionsMenu options={opts} align="right" /></div></div>
			</div>
		);
	};

	return (
		<div className="space-y-3">


			{loading ? (
				<div className="rounded-xl border border-slate-200 bg-white overflow-hidden p-4 text-slate-500">Loading…</div>
			) : !tree.length ? (
				<div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 bg-white">No data found for the current filters.</div>
			) : (
				tree.map(a => <AdminCard key={a.admin.id} a={a} />)
			)}
		</div>
	);
}

/* ================================== Page ================================== */
export default function SuperAdminUsersPage() {
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [sortBy, setSortBy] = useState('created_at');
	const [sortOrder, setSortOrder] = useState('DESC');

	const [search, setSearch] = useState('');
	const [debounced, setDebounced] = useState('');
	const [roleFilter, setRoleFilter] = useState('');
	const [statusFilter, setStatusFilter] = useState('');

	const [rows, setRows] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);

	// lists for wizard
	const [adminsList, setAdminsList] = useState([]);
	const [coachesList, setCoachesList] = useState([]);

	// modals
	const [wizardOpen, setWizardOpen] = useState(false);
	const [transferOpen, setTransferOpen] = useState(false); // (not used here but keep if you had it)
	const [assignCoachOpen, setAssignCoachOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'

	useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);

	const fetchLists = useCallback(async () => {
		try {
			const resAdmins = await api.get('/auth/super-admin/admins', { params: { page: 1, limit: 200 } }).catch(() => null);
			setAdminsList(resAdmins?.data?.items || []);
			const resCoaches = await api.get('/auth/coaches/select').catch(() => null);
			setCoachesList(resCoaches?.data || []);
		} catch { /* ignore */ }
	}, []);

	const fetchOverview = useCallback(async () => {
		setLoading(true);
		try {
			const params = { page, limit, sortBy, sortOrder, includeTree: 1 };
			if (debounced) params.search = debounced;
			if (roleFilter) params.role = roleFilter;
			if (statusFilter) params.status = statusFilter;

			const { data } = await api.get('/auth/super-admin/overview', { params });
			setRows(data?.items || []);
			setTotal(data?.total || 0);
		} catch (e) {
			Notification(e?.response?.data?.message || 'Failed to load overview', 'error');
			setRows([]); setTotal(0);
		} finally { setLoading(false); }
	}, [page, limit, sortBy, sortOrder, debounced, roleFilter, statusFilter]);

	useEffect(() => { fetchLists(); }, [fetchLists]);
	useEffect(() => { fetchOverview(); }, [fetchOverview]);

	const stats = useMemo(() => {
		const s = { users: rows.length, admins: 0, coaches: 0, clients: 0, active: 0, suspended: 0, pending: 0 };
		for (const r of rows) {
			const role = String(r.role || '').toLowerCase();
			const status = String(r.status || '').toLowerCase();
			if (role === 'admin') s.admins++;
			if (role === 'coach') s.coaches++;
			if (role === 'client') s.clients++;
			if (status === 'active') s.active++;
			if (status === 'suspended') s.suspended++;
			if (status === 'pending') s.pending++;
		}
		return s;
	}, [rows]);

	const toggleSort = (field) => {
		if (sortBy === field) setSortOrder(o => (o === 'ASC' ? 'DESC' : 'ASC'));
		else { setSortBy(field); setSortOrder('ASC'); }
	};

	/* -------- row actions -------- */
	const setStatus = async (user, status) => {
		try {
			await api.put(`/auth/status/${user.id}`, { status });
			Notification(`Status → ${toTitle(status)}`, 'success');
			fetchOverview();
		} catch (e) {
			Notification(e?.response?.data?.message || 'Status update failed', 'error');
		}
	};
	const delUser = async (user) => {
		if (!confirm(`Delete ${user.name || user.email}?`)) return;
		try {
			await api.delete(`/auth/user/${user.id}`);
			Notification('User deleted', 'success');
			fetchOverview();
		} catch (e) {
			Notification(e?.response?.data?.message || 'Delete failed', 'error');
		}
	};
	const impersonate = async (user) => {
		try {
			const { data } = await api.post('/auth/super-admin/impersonate', { userId: user.id });
			Notification('Impersonation token issued', 'success');
			console.log('impersonate token', data?.accessToken);
		} catch (e) {
			Notification(e?.response?.data?.message || 'Impersonation unavailable', 'error');
		}
	};

	const columns = [
		{
			header: 'User',
			accessor: 'name',
			className: 'text-nowrap',
			cell: r => (
				<div className="flex items-center gap-3">
					<Avatar name={r.name} email={r.email} />
					<div className="min-w-0">
						<div className="truncate font-medium text-slate-800">{r.name || '—'}</div>
						<div className="truncate text-xs text-slate-500">{r.email}</div>
					</div>
				</div>
			)
		},
		{ header: 'Role', accessor: 'role', cell: r => <RolePill role={r.role} /> },
		{ header: 'Status', accessor: 'status', cell: r => <StatusPill status={r.status} /> },
		{ header: 'Owner Admin', accessor: 'adminId', cell: r => r.adminId ? <Pill><Crown className="w-3 h-3" /> {String(r.adminId).slice(0, 6)}</Pill> : <span className="text-slate-400">—</span> },
		{ header: 'Coach', accessor: 'coachId', cell: r => r.coachId ? <Pill><UserCog className="w-3 h-3" /> {String(r.coachId).slice(0, 6)}</Pill> : <span className="text-slate-400">—</span> },
		{ header: 'Days Left', accessor: 'daysLeft', cell: r => <DaysLeftPill days={r.daysLeft} /> },
		{
			header: 'Actions',
			accessor: '_',
			cell: r => {
				const opts = [
					String(r.status).toLowerCase() !== 'active'
						? { label: 'Activate', onClick: () => setStatus(r, 'active') }
						: { label: 'Suspend', onClick: () => setStatus(r, 'suspended') },
					...(String(r.role).toLowerCase() === 'client' ? [{ label: 'Assign Coach', onClick: () => { setSelectedUser(r); setAssignCoachOpen(true); } }] : []),
					{ label: 'Impersonate', onClick: () => impersonate(r) },
					{ label: 'Delete', className: 'text-rose-600', onClick: () => delUser(r) },
				];
				return <ActionsMenu options={opts} align="right" />;
			}
		}
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="relative overflow-hidden rounded-2xl border border-indigo-100/60 bg-white/60 shadow-sm backdrop-blur">
				<div className="absolute inset-0 overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 opacity-95" />
					<div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.25) 1px, transparent 1px)', backgroundSize: '22px 22px', backgroundPosition: '-1px -1px' }} />
					<div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
					<div className="absolute -bottom-16 -right-8 h-60 w-60 rounded-full bg-blue-300/30 blur-3xl" />
				</div>

				<div className="relative p-6 sm:p-8 text-white">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
						<div>
							<h1 className="text-2xl md:text-4xl font-semibold">Super Admin • Users</h1>
							<p className="text-white/85 mt-1">Create Admins, Coaches, and Clients; assign plans; manage across tenants.</p>
						</div>

						<div className="flex items-center gap-2">
							<button
								onClick={() => setViewMode(v => (v === 'grouped' ? 'flat' : 'grouped'))}
								className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white border border-white/20 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30"
								title="Toggle view"
							>
								{viewMode === 'grouped' ? <Rows size={16} /> : <LayoutGrid size={16} />}
								{viewMode === 'grouped' ? 'Flat Table' : 'Grouped Tree'}
							</button>
							<button
								onClick={() => setWizardOpen(true)}
								className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 bg-white hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/30"
							>
								<Plus size={16} />
								Create User
							</button>
						</div>
					</div>

					<div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-3">
						<StatCard icon={Users} title="Users (page)" value={stats.users} />
						<StatCard icon={Crown} title="Admins" value={stats.admins} />
						<StatCard icon={UserCog} title="Coaches" value={stats.coaches} />
						<StatCard icon={UserCircle2} title="Clients" value={stats.clients} />
						<StatCard icon={UserCheck} title="Active" value={stats.active} />
						<StatCard icon={EyeOff} title="Suspended" value={stats.suspended} />
					</div>
				</div>
			</div>

			{/* Toolbar */}
			<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="flex flex-wrap items-center gap-2 p-3">
					<div className="relative w-full md:w-72">
						<Search className="absolute right-3 ltr:left-3 z-[10] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						<input
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
							placeholder="Search by name/email/phone"
							className="h-[40px] w-full ltr:pl-8 rtl:pr-8 rounded-lg bg-white text-slate-900 border border-slate-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 hover:border-indigo-400 transition"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Select
							className="!max-w-[180px] !w-full"
							placeholder="Role"
							options={[{ id: '', label: 'All Roles' }, { id: 'admin', label: 'Admin' }, { id: 'coach', label: 'Coach' }, { id: 'client', label: 'Client' }]}
							value={roleFilter}
							onChange={(id) => { setRoleFilter(id); setPage(1); }}
						/>
						<Select
							className="!max-w-[180px] !w-full"
							placeholder="Status"
							options={[{ id: '', label: 'All Statuses' }, { id: 'active', label: 'Active' }, { id: 'pending', label: 'Pending' }, { id: 'suspended', label: 'Suspended' }]}
							value={statusFilter}
							onChange={(id) => { setStatusFilter(id); setPage(1); }}
						/>
						<button
							onClick={() => toggleSort('created_at')}
							className="inline-flex items-center h-[40px] gap-2 px-4 py-2 rounded-lg text-slate-900 bg-white border border-slate-300 text-sm hover:border-indigo-400 transition"
						>
							<span>Newest</span>
							{sortBy === 'created_at' ? (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : null}
						</button>
					</div>
				</div>
			</div>

			{/* Table / Tree */}
			{viewMode === 'flat' ? (
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
					{loading ? (
						<div className="p-4 text-slate-500">Loading…</div>
					) : (
						<DataTable
							columns={columns}
							data={rows}
							loading={loading}
							itemsPerPage={limit}
							pagination
							serverPagination
							page={page}
							onPageChange={setPage}
							totalRows={total}
							selectable={false}
							rowClassName="hover:bg-slate-50 transition"
							headerClassName="sticky top-0 bg-slate-50/80 backdrop-blur z-10"
						/>
					)}
				</div>
			) : (
				<GroupedTree
					rows={rows}
					loading={loading}
					onSetStatus={setStatus}
					onAssignCoach={(user) => { setSelectedUser(user); setAssignCoachOpen(true); }}
					onDelete={delUser}
					onImpersonate={impersonate}
				/>
			)}

			{/* Create Wizard */}
			<CreateUserWizard
				open={wizardOpen}
				onClose={() => setWizardOpen(false)}
				onCreated={() => fetchOverview()}
				admins={adminsList}
				coaches={coachesList}
			/>
			{/* (Optional) your existing AssignCoach modal can remain here if you use it */}
		</div>
	);
}
