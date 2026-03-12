
import {
	Trophy,
	Target,
	TrendingUp,
	Users,
} from "lucide-react";
import { useTranslations } from "next-intl";



export function StatsBar() {
	const t = useTranslations("home.hero");

	const stats = [
		{ icon: Trophy, value: t("stats.coaches.value"), label: t("stats.coaches.label"), color: "from-[var(--color-primary-400)] to-[var(--color-primary-600)]" },
		{ icon: Target, value: t("stats.members.value"), label: t("stats.members.label"), color: "from-[var(--color-secondary-400)] to-[var(--color-secondary-600)]" },
		{ icon: TrendingUp, value: t("stats.programs.value"), label: t("stats.programs.label"), color: "from-[var(--color-primary-500)] to-[var(--color-secondary-500)]" },
		{ icon: Users, value: t("stats.roles.value"), label: t("stats.roles.label"), color: "from-[var(--color-secondary-500)] to-[var(--color-primary-400)]" },
	];

	return (
		<section id="stats-bar" className=" z-[100] relative overflow-hidden py-12 sm:py-16 md:py-20">
			{/* Ambient glow */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div className="h-64 w-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.12),transparent_70%)] blur-3xl" />
			</div>

			<div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
				<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
					{stats.map((stat, i) => {
						const Icon = stat.icon;
						return (
							<div
								key={i}
								id={`stat-${i}`}
								data-aos="fade-up"
								data-aos-delay={i * 80}
								data-aos-duration="600"
								className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[var(--color-primary-500)]/30 hover:bg-white/[0.05] sm:p-6 md:p-7"
							>
								{/* Hover radial glow */}
								<div
									aria-hidden="true"
									className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.1),transparent_65%)]"
								/>

								{/* Top row: icon + accent line */}
								<div className="mb-4 flex items-center justify-between">
									<div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-[0_4px_14px_rgba(99,102,241,0.3)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
										<Icon className="h-4 w-4 text-white" aria-hidden="true" />
									</div>
									<div className={`h-[2px] w-10 rounded-full bg-gradient-to-r ${stat.color} opacity-40 transition-all duration-500 group-hover:w-16 group-hover:opacity-80`} aria-hidden="true" />
								</div>

								{/* Value */}
								<p className="mb-1 bg-gradient-to-br from-[var(--color-gradient-from)] via-[var(--color-gradient-via)] to-[var(--color-gradient-to)] bg-clip-text text-3xl font-black leading-none tracking-tight text-transparent sm:text-4xl xl:text-5xl">
									{stat.value}
								</p>

								{/* Label */}
								<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 transition-colors duration-300 group-hover:text-white/55">
									{stat.label}
								</p>

								{/* Bottom accent bar */}
								<div
									aria-hidden="true"
									className={`absolute bottom-0 left-0 h-[2px] w-0 rounded-full bg-gradient-to-r ${stat.color} transition-all duration-500 group-hover:w-full`}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}