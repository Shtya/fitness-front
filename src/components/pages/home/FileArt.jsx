"use client";

export const SCENE_PHOTOS = {
	workout: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=80",
	meals: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1800&q=80",
	report: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1800&q=80",
	intake: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
};

export function PhotoBanner({ src, title, subtitle }) {
	return (
		<div className="relative mb-4 h-40 overflow-hidden rounded-2xl">
			<img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
			<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
			<div className="absolute inset-x-0 bottom-0 p-4 text-white">
				<p className="text-[16px] font-semibold leading-tight">{title}</p>
				{subtitle ? <p className="mt-1 text-[12px] text-white/80">{subtitle}</p> : null}
			</div>
		</div>
	);
}

export function ExerciseBanner({ title, subtitle }) {
	return <PhotoBanner src={SCENE_PHOTOS.workout} title={title} subtitle={subtitle} />;
}

export function MealBanner({ title, subtitle }) {
	return <PhotoBanner src={SCENE_PHOTOS.meals} title={title} subtitle={subtitle} />;
}

export function ReportBanner({ title, subtitle }) {
	return <PhotoBanner src={SCENE_PHOTOS.report} title={title} subtitle={subtitle} />;
}
