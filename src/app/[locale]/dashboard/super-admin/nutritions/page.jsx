// "use client";

// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import { useTranslations } from "next-intl";
// import { Target, TrendingUp, Calendar, Users as UsersIcon, Search, X, Clock, Filter, Eye, PencilLine, Plus } from "lucide-react";

// import api from "@/utils/axios";
// import { Modal, StatCard } from "@/components/dashboard/ui/UI";
// import { GradientStatsHeader } from "@/components/molecules/GradientStatsHeader";
// import { Notification } from "@/config/Notification";
// import { useValues } from "@/context/GlobalContext";
// import Select from "@/components/atoms/Select";

// // Reuse existing building blocks from your current page
// import { PlanListView, MealPlanForm, PlanDetailsView } from "@/app/(dashboard)/nutrition/NutritionManagementPage";

// export default function SuperAdminMealPlansPage() {
// 	const t = useTranslations("nutrition");
// 	const { usersByRole, fetchUsers } = useValues();

// 	// ===== Stats =====
// 	const [loadingStats, setLoadingStats] = useState(true);
// 	const [stats, setStats] = useState(null);

// 	// ===== List =====
// 	const [plans, setPlans] = useState([]);
// 	const [listLoading, setListLoading] = useState(true);

// 	// ===== UI State =====
// 	const [searchText, setSearchText] = useState("");
// 	const [perPage, setPerPage] = useState(12);
// 	const [sortBy, setSortBy] = useState("created_at");
// 	const [sortOrder, setSortOrder] = useState("DESC");

// 	const [addOpen, setAddOpen] = useState(false);
// 	const [editPlan, setEditPlan] = useState(null);
// 	const [assignPlan, setAssignPlan] = useState(null);
// 	const [selectedPlan, setSelectedPlan] = useState(null);
// 	const [detailsOpen, setDetailsOpen] = useState(false);

// 	const [deletePlanId, setDeletePlanId] = useState(null);
// 	const [deleteOpen, setDeleteOpen] = useState(false);
// 	const [deleteLoading, setDeleteLoading] = useState(false);

// 	const toggleSort = key => {
// 		if (sortBy !== key) {
// 			setSortBy(key);
// 			setSortOrder("DESC");
// 		} else {
// 			setSortOrder(o => (o === "ASC" ? "DESC" : "ASC"));
// 		}
// 	};

// 	useEffect(() => {
// 		fetchUsers("client");
// 		fetchUsers("coach");
// 	}, [fetchUsers]);

// 	const clientOptions = usersByRole["client"] || [];

// 	const fetchStats = useCallback(async () => {
// 		setLoadingStats(true);
// 		try {
// 			const { data } = await api.get("/nutrition/stats", { params: { lang: "ar" } });
// 			setStats(data);
// 		} catch (e) {
// 			setStats(null);
// 		} finally {
// 			setLoadingStats(false);
// 		}
// 	}, []);

// 	const fetchPlans = useCallback(async () => {
// 		setListLoading(true);
// 		try {
// 			const { data } = await api.get("/nutrition/meal-plans", {
// 				params: {
// 					search: searchText || undefined,
// 					sortBy,
// 					sortOrder,
// 					limit: perPage,
// 					lang: "ar",
// 				},
// 			});
// 			setPlans(data.records || []);
// 		} catch (e) {
// 			setPlans([]);
// 		} finally {
// 			setListLoading(false);
// 		}
// 	}, [searchText, sortBy, sortOrder, perPage]);

// 	useEffect(() => {
// 		(async () => {
// 			await Promise.all([fetchStats(), fetchPlans()]);
// 		})();
// 	}, [fetchStats, fetchPlans]);

// 	// ===== Assignments loader for details =====
// 	const fetchAssignments = useCallback(async planId => {
// 		try {
// 			const { data } = await api.get(`/nutrition/meal-plans/${planId}/assignments`, { params: { lang: "ar" } });
// 			return data || [];
// 		} catch (_) {
// 			return [];
// 		}
// 	}, []);

// 	const onPreview = async plan => {
// 		setSelectedPlan(plan);
// 		setDetailsOpen(true);
// 		const a = await fetchAssignments(plan.id);
// 		setSelectedPlan(p => ({ ...(p || plan), __assignments: a }));
// 	};

// 	// ===== CRUD =====
// 	const onCreate = async payload => {
// 		try {
// 			await api.post("/nutrition/meal-plans", payload, { params: { lang: "ar" } });
// 			Notification(t("super_plans.created"), "success");
// 			setAddOpen(false);
// 			await Promise.all([fetchStats(), fetchPlans()]);
// 		} catch (e) {
// 			Notification(e?.response?.data?.message || t("errors.create_failed"), "error");
// 		}
// 	};

// 	const onUpdate = async (planId, payload) => {
// 		try {
// 			await api.put(`/nutrition/meal-plans/${planId}`, payload, { params: { lang: "ar" } });
// 			Notification(t("super_plans.updated"), "success");
// 			setEditPlan(null);
// 			await Promise.all([fetchStats(), fetchPlans()]);
// 		} catch (e) {
// 			Notification(e?.response?.data?.message || t("errors.update_failed"), "error");
// 		}
// 	};

// 	const onAssign = async (planId, userId, setSubmitting) => {
// 		try {
// 			await api.post(`/nutrition/meal-plans/${planId}/assign`, { userId }, { params: { lang: "ar" } });
// 			Notification(t("super_plans.assigned"), "success");
// 			setAssignPlan(null);
// 			await fetchPlans();
// 			if (selectedPlan?.id === planId) {
// 				const a = await fetchAssignments(planId);
// 				setSelectedPlan(p => ({ ...(p || {}), __assignments: a }));
// 			}
// 		} catch (e) {
// 			Notification(e?.response?.data?.message || t("errors.assign_failed"), "error");
// 		} finally {
// 			setSubmitting(false);
// 		}
// 	};

// 	const onDelete = async () => {
// 		if (!deletePlanId) return;
// 		setDeleteLoading(true);
// 		try {
// 			await api.delete(`/nutrition/meal-plans/${deletePlanId}`, { params: { lang: "ar" } });
// 			Notification(t("super_plans.deleted"), "success");
// 			setDeleteOpen(false);
// 			setDeletePlanId(null);
// 			await Promise.all([fetchStats(), fetchPlans()]);
// 		} catch (e) {
// 			Notification(e?.response?.data?.message || t("errors.delete_failed"), "error");
// 		} finally {
// 			setDeleteLoading(false);
// 		}
// 	};

// 	return (
// 		<div className="space-y-5 sm:space-y-6">
// 			<GradientStatsHeader
// 				onClick={() => setAddOpen(true)}
// 				btnName={t("super_plans.actions.new")}
// 				title={t("super_plans.title")}
// 				desc={t("super_plans.subtitle")}
// 				loadingStats={loadingStats}
// 			>
// 				{/* Core stats */}
// 				<StatCard icon={Target} title={t("stats.total_plans")} value={stats?.totals?.totalPlans} />
// 				<StatCard icon={TrendingUp} title={t("stats.active_plans")} value={stats?.totals?.activePlans} />
// 				<StatCard icon={Calendar} title={t("stats.total_days")} value={stats?.totals?.totalDays} />
// 				<StatCard icon={UsersIcon} title={t("stats.assignments")} value={stats?.totals?.totalAssignments} />

// 				{/* New multivendor stats */}
// 				<StatCard icon={Target} title={t("stats.global_plans")} value={stats?.totals?.globalPlansCount} />
// 				<StatCard icon={TrendingUp} title={t("stats.my_plans")} value={stats?.totals?.myPlansCount} />
// 			</GradientStatsHeader>

// 			{/* Search / Sort / Per page */}
// 			<div className="relative">
// 				<div className="flex items-center justify-between gap-2 flex-wrap">
// 					<div className="relative flex-1 max-w-[320px]">
// 						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
// 						<input
// 							value={searchText}
// 							onChange={e => setSearchText(e.target.value)}
// 							placeholder={t("super_plans.search.placeholder")}
// 							aria-label={t("super_plans.search.aria")}
// 							className={[
// 								"h-11 w-full pl-10 pr-10 rounded-lg",
// 								"border border-slate-200 bg-white/90 text-slate-900",
// 								"shadow-sm hover:shadow transition",
// 								"focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/40",
// 							].join(" ")}
// 						/>
// 						{!!searchText && (
// 							<button
// 								type="button"
// 								onClick={() => setSearchText("")}
// 								className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
// 								aria-label={t("super_plans.search.clear")}
// 								title={t("super_plans.search.clear")}
// 							>
// 								<X className="w-4 h-4" />
// 							</button>
// 						)}
// 					</div>

// 					<div className="flex items-center gap-2">
// 						<div className="min-w-[130px]">
// 							<Select
// 								className="!w-full"
// 								placeholder={t("super_plans.pagination.per_page")}
// 								options={[
// 									{ id: 8, label: 8 },
// 									{ id: 12, label: 12 },
// 									{ id: 20, label: 20 },
// 									{ id: 30, label: 30 },
// 								]}
// 								value={perPage}
// 								onChange={n => setPerPage(Number(n))}
// 							/>
// 						</div>

// 						<button
// 							type="button"
// 							onClick={() => toggleSort("created_at")}
// 							className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm focus-visible:outline-none"
// 							title={sortBy === "created_at" ? (sortOrder === "ASC" ? t("super_plans.sort.old_first") : t("super_plans.sort.new_first")) : t("super_plans.sort.by_date")}
// 							aria-label={t("super_plans.sort.by_date")}
// 						>
// 							<Clock size={18} />
// 							<span>
// 								{sortBy === "created_at"
// 									? sortOrder === "ASC"
// 										? t("super_plans.sort.old_first")
// 										: t("super_plans.sort.new_first")
// 									: t("super_plans.sort.by_date")}
// 							</span>
// 						</button>
// 					</div>
// 				</div>
// 			</div>

// 			{/* Plans list (reuse your existing list view) */}
// 			<PlanListView
// 				loading={listLoading}
// 				plans={plans}
// 				onPreview={onPreview}
// 				onEdit={setEditPlan}
// 				onAssign={setAssignPlan}
// 				onDelete={id => {
// 					setDeletePlanId(id);
// 					setDeleteOpen(true);
// 				}}
// 			/>

// 			{/* Create */}
// 			<Modal
// 				open={addOpen}
// 				maxHBody="!h-[90%]"
// 				maxH="h-[90vh]"
// 				cn="!py-0"
// 				onClose={() => setAddOpen(false)}
// 				title={t("super_plans.create.title")}
// 			>
// 				<MealPlanForm onSubmitPayload={onCreate} submitLabel={t("super_plans.create.cta")} />
// 			</Modal>

// 			{/* Edit */}
// 			<Modal
// 				open={!!editPlan}
// 				onClose={() => setEditPlan(null)}
// 				title={editPlan ? t("super_plans.edit.title", { name: editPlan.name }) : ""}
// 			>
// 				<div className="rounded-lg bg-gradient-to-b from-indigo-50/70 to-white p-3 sm:p-4">
// 					{editPlan && (
// 						<MealPlanForm
// 							initialPlan={editPlan}
// 							onSubmitPayload={payload => onUpdate(editPlan.id, payload)}
// 							submitLabel={t("super_plans.edit.cta")}
// 						/>
// 					)}
// 				</div>
// 			</Modal>

// 			{/* Assign */}
// 			<Modal
// 				open={!!assignPlan}
// 				onClose={() => setAssignPlan(null)}
// 				title={assignPlan ? t("super_plans.assign.title", { name: assignPlan.name }) : ""}
// 			>
// 				<div className="rounded-lg bg-gradient-to-b from-blue-50/60 to-white p-3 sm:p-4">
// 					{assignPlan && (
// 						<AssignPlanForm
// 							plan={assignPlan}
// 							clients={clientOptions}
// 							onAssign={(userId, setSubmitting) => onAssign(assignPlan.id, userId, setSubmitting)}
// 						/>
// 					)}
// 				</div>
// 			</Modal>

// 			{/* Details */}
// 			<Modal
// 				open={detailsOpen}
// 				onClose={() => setDetailsOpen(false)}
// 				title={selectedPlan ? t("super_plans.details.title", { name: selectedPlan.name }) : t("super_plans.details.title_fallback")}
// 			>
// 				<div className="rounded-lg bg-gradient-to-b from-slate-50/60 to-white p-3 sm:p-4">
// 					{selectedPlan && <PlanDetailsView plan={selectedPlan} />}
// 				</div>
// 			</Modal>

// 			{/* Delete */}
// 			<ConfirmDialog
// 				loading={deleteLoading}
// 				open={deleteOpen}
// 				onClose={() => {
// 					setDeleteOpen(false);
// 					setDeletePlanId(null);
// 				}}
// 				title={t("super_plans.delete.title")}
// 				message={t("super_plans.delete.message")}
// 				confirmText={t("super_plans.delete.confirm")}
// 				onConfirm={onDelete}
// 			/>
// 		</div>
// 	);
// }

// function ConfirmDialog({ loading, open, onClose, title, message, confirmText, onConfirm }) {
// 	const t = useTranslations();
// 	if (!open) return null;
// 	return (
// 		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
// 			<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
// 				<h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
// 				<p className="text-slate-600 mb-4">{message}</p>
// 				<div className="flex items-center justify-end gap-2">
// 					<button
// 						type="button"
// 						onClick={onClose}
// 						disabled={loading}
// 						className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm focus-visible:outline-none"
// 						aria-label={t("actions.cancel")}
// 						title={t("actions.cancel")}
// 					>
// 						{t("actions.cancel")}
// 					</button>
// 					<button
// 						type="button"
// 						onClick={onConfirm}
// 						disabled={loading}
// 						className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:outline-none"
// 						aria-label={confirmText}
// 						title={confirmText}
// 					>
// 						{loading ? t("actions.deleting") : confirmText}
// 					</button>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }

// // Lightweight Assign form to avoid importing from other file paths
// function AssignPlanForm({ plan, clients, onAssign }) {
// 	const t = useTranslations();
// 	const [userId, setUserId] = useState("");
// 	const [submitting, setSubmitting] = useState(false);

// 	const options = (clients || []).map(c => ({ id: c.id, label: c.name || c.email || `#${c.id}` }));

// 	const submit = async e => {
// 		e.preventDefault();
// 		if (!userId) return;
// 		setSubmitting(true);
// 		await onAssign(userId, setSubmitting);
// 	};

// 	return (
// 		<form onSubmit={submit} className="space-y-4">
// 			<div>
// 				<h4 className="font-medium text-slate-800 mb-2">{t("super_plans.assign.to", { name: plan.name })}</h4>
// 				<Select options={options} value={userId} onChange={setUserId} placeholder={t("super_plans.assign.placeholder")} />
// 			</div>
// 			<div className="flex items-center justify-end">
// 				<button
// 					type="submit"
// 					disabled={!userId || submitting}
// 					className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm focus-visible:outline-none disabled:opacity-60"
// 				>
// 					{submitting ? t("actions.assigning") : t("super_plans.assign.cta")}
// 				</button>
// 			</div>
// 		</form>
// 	);
// }


import React from 'react';

const page = () => {
	return (
		<div className="">
			
		</div>
	);
};

export default page;