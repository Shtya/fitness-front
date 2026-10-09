"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
	Award,
	BarChart3,
	Bell,
	BookOpen,
	Calendar,
	ClipboardList,
	CreditCard,
	Dumbbell,
	FileText,
	Heart,
	LayoutDashboard,
	MessageSquare,
	Settings,
	Shield,
	TrendingUp,
	Users,
	Utensils,
	Video,
} from "lucide-react";
import { SectionHead, Tabs } from "./ui";

const ROLE_ICONS = { client: Dumbbell, coach: Users, admin: Shield };

const FEATURES = {
	client: [
		["workouts", Dumbbell],
		["nutrition", Utensils],
		["exercises", Video],
		["progress", TrendingUp],
		["reports", Heart],
		["chat", MessageSquare],
		["reminders", Bell],
		["recipes", BookOpen],
	],
	coach: [
		["clients", Users],
		["workoutPlans", ClipboardList],
		["nutritionPlans", Utensils],
		["reports", Calendar],
		["exerciseLibrary", Award],
		["chat", MessageSquare],
		["forms", FileText],
		["sharedTools", Settings],
	],
	admin: [
		["dashboard", LayoutDashboard],
		["users", Users],
		["billing", CreditCard],
		["plans", Dumbbell],
		["forms", ClipboardList],
		["reports", BarChart3],
		["content", BookOpen],
		["operations", Shield],
	],
};

export default function RoleTabs() {
	const [role, setRole] = useState("coach");
	const t = useTranslations("home.roles");
	const reduced = useReducedMotion();

	const tabs = ["coach", "client", "admin"].map(id => ({
		id,
		label: t(`tabs.${id}`),
		icon: ROLE_ICONS[id],
	}));

	return (
		<section id="role-tabs-section" aria-labelledby="role-tabs-heading" className="hm-section">
			<div className="hm-container">
				<SectionHead
					id="role-tabs-heading"
					title={t("title")}
					lead={t("description")}
					aside={<Tabs items={tabs} value={role} onChange={setRole} label={t("badge")} group="roles" />}
				/>

				<div
					id="roles-panel"
					role="tabpanel"
					aria-labelledby={`roles-tab-${role}`}
					className="hm-roles"
				>
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={role}
							className="hm-roles__grid"
							initial={reduced ? false : { opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
							transition={{ duration: 0.2 }}
						>
							<div className="hm-roles__intro">
								<p className="hm-roles__statement">{t(`${role}.cta.title`)}</p>
								<p className="hm-body mt-4 max-w-sm">{t(`${role}.cta.description`)}</p>
								<Link href="/auth" className="hm-btn hm-btn--ghost mt-8">
									{t(`${role}.cta.button`)}
								</Link>
							</div>
							<ul className="hm-roles__list">
								{FEATURES[role].map(([key, Icon], index) => (
									<motion.li
										key={key}
										className="hm-roles__item"
										initial={reduced ? false : { opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.35, delay: reduced ? 0 : 0.04 * index, ease: [0.2, 0.8, 0.2, 1] }}
									>
										<span className="hm-roles__icon" aria-hidden="true">
											<Icon size={18} strokeWidth={1.9} />
										</span>
										<span>
											<span className="hm-roles__title">{t(`${role}.features.${key}.title`)}</span>
											<span className="hm-roles__desc">{t(`${role}.features.${key}.description`)}</span>
										</span>
									</motion.li>
								))}
							</ul>
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</section>
	);
}
