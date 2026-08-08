'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { BRAND_LOGO_SRC } from '@/lib/brand';

export default function LegalShell({ content }) {
	const locale = useLocale();
	const isAr = locale === 'ar';
	const BackIcon = isAr ? ArrowRight : ArrowLeft;

	if (!content) return null;

	return (
		<div
			className="min-h-screen antialiased"
			style={{
				background:
					'radial-gradient(1200px 600px at 10% -10%, rgba(36,211,102,0.12), transparent 55%), radial-gradient(900px 500px at 90% 0%, rgba(15,23,42,0.06), transparent 50%), #F7F8FA',
				color: '#0F172A',
				fontFamily:
					'var(--font-space-grotesk), var(--font-arabic), "Segoe UI", sans-serif',
			}}
			dir={isAr ? 'rtl' : 'ltr'}
		>
			<header
				className="sticky top-0 z-20 border-b backdrop-blur-md"
				style={{
					background: 'rgba(247,248,250,0.88)',
					borderColor: 'rgba(15,23,42,0.08)',
				}}
			>
				<div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3.5">
					<Link href="/" className="flex items-center gap-2.5">
						<Image
							src={BRAND_LOGO_SRC}
							alt="So7baFit"
							width={36}
							height={36}
							className="h-9 w-9 object-contain"
						/>
						<span className="text-[17px] font-bold tracking-tight text-slate-900">
							So7baFit
						</span>
					</Link>
					<Link
						href="/"
						className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900"
					>
						<BackIcon className="h-4 w-4" />
						{content.home}
					</Link>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:pt-14">
				<div className="mb-8 flex items-start gap-3">
					<div
						className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
						style={{
							background: 'rgba(36,211,102,0.14)',
							color: '#15803D',
						}}
					>
						<Shield className="h-5 w-5" strokeWidth={2} />
					</div>
					<div>
						<p
							className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em]"
							style={{ color: '#15803D' }}
						>
							{content.eyebrow}
						</p>
						<h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
							{content.title}
						</h1>
						<p className="mt-2 text-[13px] font-medium text-slate-500">
							{content.updated}
						</p>
					</div>
				</div>

				<p className="mb-10 text-[15px] leading-relaxed text-slate-600 sm:text-[16px]">
					{content.intro}
				</p>

				<div className="space-y-8">
					{content.sections.map(section => (
						<section key={section.heading} className="scroll-mt-24">
							<h2 className="mb-3 text-[17px] font-bold text-slate-900">
								{section.heading}
							</h2>
							<ul className="space-y-2.5">
								{section.body.map(line => (
									<li
										key={line.slice(0, 48)}
										className="text-[14px] leading-relaxed text-slate-600 sm:text-[15px]"
									>
										{line}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>

				<div
					className="mt-14 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-4"
					style={{
						background: '#FFFFFF',
						border: '1px solid rgba(15,23,42,0.08)',
						boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
					}}
				>
					<p className="text-[13px] text-slate-500">
						{content.relatedLabel}{' '}
						<Link
							href={content.relatedHref}
							className="font-semibold text-slate-900 underline-offset-2 hover:underline"
						>
							{content.relatedName}
						</Link>
					</p>
					<a
						href="mailto:info@so7bafit.com"
						className="text-[13px] font-semibold text-emerald-700 hover:text-emerald-800"
					>
						info@so7bafit.com
					</a>
				</div>
			</main>
		</div>
	);
}
