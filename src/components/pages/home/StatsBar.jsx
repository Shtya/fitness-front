"use client";

import { useTranslations } from "next-intl";
import { Trophy, Target, TrendingUp, Users } from "lucide-react";

export default function StatsBar() {
  const t = useTranslations("home.hero");

  const stats = [
    { icon: Trophy, value: t("stats.coaches.value"), label: t("stats.coaches.label") },
    { icon: Target, value: t("stats.members.value"), label: t("stats.members.label") },
    { icon: TrendingUp, value: t("stats.programs.value"), label: t("stats.programs.label") },
    { icon: Users, value: "50,000+", label: t("trust.activeUsers") }
  ];

  return (
    <section className="relative">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;

            // rotate theme usage a bit so cards don't look identical,
            // but all still come from your CSS vars
            const iconBg =
              index % 2 === 0
                ? "bg-[linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))]"
                : "bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-secondary-500))]";

            const valueText =
              index % 2 === 0
                ? "theme-gradient-text"
                : "bg-[linear-gradient(135deg,var(--color-primary-400),var(--color-secondary-400))] bg-clip-text text-transparent";

            const bottomAccent =
              index % 2 === 0
                ? "bg-[linear-gradient(135deg,var(--color-gradient-from),var(--color-gradient-to))]"
                : "bg-[linear-gradient(135deg,var(--color-primary-500),var(--color-secondary-500))]";

            return (
              <div key={index} className="group relative">
                {/* Glow (no inline styles) */}
                <div className="absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-primary-500)_35%,transparent),transparent_60%)]" />

                {/* Card */}
                <div
                  className={[
                    "relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80",
                    "p-6 backdrop-blur-xl transition-all duration-300",
                    "group-hover:-translate-y-1 group-hover:border-slate-600",
                    "shadow-[0_10px_15px_-3px_rgba(0,0,0,0.30),0_4px_6px_-2px_rgba(0,0,0,0.20),inset_0_2px_4px_rgba(255,255,255,0.05)]"
                  ].join(" ")}
                >
                  <div className="flex flex-col items-center space-y-3 text-center">
                    {/* Icon */}
                    <div
                      className={[
                        "grid h-14 w-14 place-items-center rounded-xl shadow-lg",
                        "transition-transform duration-300 group-hover:scale-110",
                        iconBg
                      ].join(" ")}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    {/* Value */}
                    <p className={["text-4xl font-black font-en ", valueText].join(" ")}>
                      {stat.value}
                    </p>

                    {/* Label */}
                    <p className="text-sm font-bold uppercase tracking-wider text-gray-400">
                      {stat.label}
                    </p>
                  </div>

                  {/* Bottom Accent */}
                  <div
                    className={[
                      "absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl",
                      "origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100",
                      bottomAccent
                    ].join(" ")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
