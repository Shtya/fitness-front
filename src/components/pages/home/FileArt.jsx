"use client";

import { Camera, Dumbbell, Utensils } from "lucide-react";

/**
 * Section headers inside the homepage's client-file replica. These used to be
 * hot-linked stock photos; a product-style header reads as the real app and loads
 * nothing extra.
 */
export function FileHeader({ icon: Icon, title, subtitle }) {
	return (
		<div className="mb-4 flex items-center gap-3 rounded-xl bg-[var(--hm-chalk)] p-3">
			<span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--hm-accent)] text-white">
				<Icon size={18} strokeWidth={2} aria-hidden="true" />
			</span>
			<span className="min-w-0">
				<span className="block text-[15px] font-semibold leading-tight text-[var(--hm-ink)]">{title}</span>
				{subtitle ? (
					<span className="mt-0.5 block text-[12.5px] text-[var(--hm-muted)]">{subtitle}</span>
				) : null}
			</span>
		</div>
	);
}

export function ExerciseBanner(props) {
	return <FileHeader icon={Dumbbell} {...props} />;
}

export function MealBanner(props) {
	return <FileHeader icon={Utensils} {...props} />;
}

export function ReportBanner(props) {
	return <FileHeader icon={Camera} {...props} />;
}
