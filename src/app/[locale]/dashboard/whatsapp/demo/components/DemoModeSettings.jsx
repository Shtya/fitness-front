'use client';

import { useState } from 'react';
import {
	FlaskConical,
	ListOrdered,
	Loader2,
	Settings2,
	Sparkles,
	ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getDemoLabels } from '../demo-translations';
import { useDemoMode } from '../DemoModeProvider';
import DemoInfoTip from './DemoInfoTip';
import DemoJsonPanel from './DemoJsonPanel';
import DemoModeTabs from './DemoModeTabs';
import DemoProfilePicker from './DemoProfilePicker';
import DemoStudio from './DemoStudio';

const FLAG_GROUPS = [
	{ key: 'groupVisibility', flags: ['useFakeContacts', 'overlayRealChats'] },
	{
		key: 'groupBehavior',
		flags: ['useFakeTyping', 'useFakeMessages', 'randomTyping', 'randomDelays'],
	},
	{ key: 'groupAppearance', flags: ['hideDemoBadge'] },
];

const HOW_STEPS = [
	{ key: 'demoModeStep1', hintKey: 'demoModeStep1Hint', icon: ListOrdered },
	{ key: 'demoModeStep2', hintKey: 'demoModeStep2Hint', icon: ToggleRight },
	{ key: 'demoModeStep3', hintKey: 'demoModeStep3Hint', icon: Settings2 },
	{ key: 'demoModeStep4', hintKey: 'demoModeStep4Hint', icon: FlaskConical },
];

export default function DemoModeSettings({ locale, realAccountId, realConversations = [] }) {
	const demo = useDemoMode();
	const labels = getDemoLabels(locale);
	const [studioOpen, setStudioOpen] = useState(false);
	const [featuresMode, setFeaturesMode] = useState('form');
	const needsProfile = !demo.settings.activeProfileId;

	const applySettingsJson = async parsed => {
		const patch = {};
		if (typeof parsed?.enabled === 'boolean') patch.enabled = parsed.enabled;
		if (parsed?.featureFlags && typeof parsed.featureFlags === 'object') {
			patch.featureFlags = {
				...demo.settings.featureFlags,
				...parsed.featureFlags,
			};
		} else if (parsed?.flags && typeof parsed.flags === 'object') {
			patch.featureFlags = {
				...demo.settings.featureFlags,
				...parsed.flags,
			};
		}
		if (Object.keys(patch).length === 0) {
			throw new Error(labels.invalidJson);
		}
		await demo.updateSettings(patch);
	};

	return (
		<>
			<section
				dir={labels.dir}
				className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900"
			>
				{/* Header */}
				<div className="border-b border-slate-100 bg-gradient-to-br from-[var(--color-primary-50)] via-white to-[var(--color-secondary-50)] px-4 py-4 dark:border-slate-800 dark:from-[var(--color-primary-950)]/40 dark:via-slate-900 dark:to-[var(--color-secondary-950)]/30 sm:px-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex gap-3">
							<span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-500)] text-white shadow-md shadow-[var(--color-primary-500)]/25">
								<FlaskConical size={20} />
							</span>
							<div>
								<div className="flex items-center gap-1.5">
									<h2 className="text-base font-black text-slate-900 dark:text-white">
										{labels.demoMode}
									</h2>
									<DemoInfoTip text={labels.demoModeHint} />
								</div>
								<p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
									{labels.demoModeHint}
								</p>
							</div>
						</div>
						<div className="flex flex-col items-stretch gap-1 sm:items-end">
							<div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
								<div className="flex items-center gap-1.5">
									<span
										className={`text-xs font-black ${
											demo.settings.enabled ? 'text-emerald-600' : 'text-slate-400'
										}`}
									>
										{demo.settings.enabled ? labels.enabled : labels.disabled}
									</span>
									<DemoInfoTip text={labels.enableDemoHint} />
								</div>
								<Switch
									aria-label={labels.enableDemo}
									checked={Boolean(demo.settings.enabled)}
									disabled={demo.loading || demo.saving || needsProfile}
									onCheckedChange={value => void demo.setEnabled(value)}
								/>
							</div>
							{needsProfile && !demo.loading && (
								<p className="max-w-56 text-end text-[11px] leading-snug text-amber-600 dark:text-amber-400">
									{labels.needsProfileHint}
								</p>
							)}
						</div>
					</div>
				</div>

				<div className="space-y-4 p-4 sm:p-5">
					{/* How-to guide */}
					<div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
						<p className="mb-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
							{labels.demoModeHowTitle}
						</p>
						<ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
							{HOW_STEPS.map((step, index) => {
								const Icon = step.icon;
								return (
									<li
										key={step.key}
										className="flex gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
									>
										<span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-[var(--color-primary-950)]/50">
											<Icon size={14} />
										</span>
										<div className="min-w-0">
											<div className="flex items-start gap-1">
												<p className="text-xs font-bold text-slate-800 dark:text-slate-100">
													{labels[step.key]}
												</p>
												<DemoInfoTip text={labels[step.hintKey]} />
											</div>
											<p className="mt-0.5 text-[11px] leading-snug text-slate-400">
												{labels[step.hintKey]}
											</p>
											<span className="sr-only">Step {index + 1}</span>
										</div>
									</li>
								);
							})}
						</ol>
					</div>

					{demo.error && (
						<p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950/20">
							{demo.error}
						</p>
					)}

					<div className="grid gap-4 lg:grid-cols-2">
						{/* Profile */}
						<div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
							<div className="mb-2 flex items-center gap-1.5">
								<p className="text-xs font-black uppercase tracking-wide text-slate-500">
									{labels.profile}
								</p>
								<DemoInfoTip text={labels.profileHint} />
							</div>
							{demo.loading ? (
								<div className="flex h-10 items-center gap-2 text-xs text-slate-400">
									<Loader2 size={14} className="animate-spin" />
									{labels.saving}
								</div>
							) : (
								<DemoProfilePicker
									profiles={demo.profiles}
									activeProfileId={demo.settings.activeProfileId}
									disabled={demo.saving}
									labels={labels}
									onActivate={demo.activateProfile}
									onCreate={demo.createProfile}
									onClone={demo.cloneProfile}
									onDelete={demo.deleteProfile}
								/>
							)}
						</div>

						{/* Feature flags */}
						<div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
							<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
								<div className="flex items-center gap-1.5">
									<Settings2 size={14} className="text-slate-400" />
									<p className="text-xs font-black uppercase tracking-wide text-slate-500">
										{labels.featureFlags}
									</p>
									<DemoInfoTip text={labels.featureFlagsHint} />
								</div>
								<DemoModeTabs
									labels={labels}
									mode={featuresMode}
									onChange={setFeaturesMode}
								/>
							</div>

							{featuresMode === 'json' ? (
								<DemoJsonPanel
									labels={labels}
									title={labels.settingsJsonTitle}
									hint={labels.settingsJsonHint}
									example={labels.settingsJsonExample}
									onSubmit={applySettingsJson}
									disabled={demo.saving || needsProfile}
									compact
								/>
							) : (
								<div className="space-y-3">
									{FLAG_GROUPS.map(group => (
										<div key={group.key}>
											<p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
												{labels[group.key]}
											</p>
											<div className="space-y-1.5">
												{group.flags.map(flag => (
													<label
														key={flag}
														className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-2.5 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/40"
													>
														<span className="flex min-w-0 items-center gap-1.5">
															<span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
																{labels[flag]}
															</span>
															<DemoInfoTip text={labels[`${flag}Hint`]} />
														</span>
														<Switch
															checked={demo.settings.featureFlags[flag] !== false}
															disabled={demo.saving}
															onCheckedChange={value =>
																void demo.setFeatureFlag(flag, value)
															}
														/>
													</label>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Studio CTA */}
					<div className="flex flex-col gap-3 rounded-xl border border-[var(--color-primary-200)] bg-gradient-to-r from-[var(--color-primary-50)] to-transparent p-3 dark:border-[var(--color-primary-900)] dark:from-[var(--color-primary-950)]/30 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-start gap-2">
							<span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-500)] text-white">
								<Sparkles size={15} />
							</span>
							<div>
								<div className="flex items-center gap-1.5">
									<p className="text-sm font-black text-slate-900 dark:text-white">
										{labels.studio}
									</p>
									<DemoInfoTip text={labels.openStudioHint} />
								</div>
								<p className="mt-0.5 text-[11px] leading-snug text-slate-500">
									{labels.studioHint}
								</p>
							</div>
						</div>
						<Button
							type="button"
							onClick={() => setStudioOpen(true)}
							disabled={!demo.settings.activeProfileId}
							className="shrink-0"
						>
							<FlaskConical />
							{labels.openStudio}
						</Button>
					</div>
				</div>
			</section>
			<DemoStudio
				open={studioOpen}
				onOpenChange={setStudioOpen}
				labels={labels}
				realAccountId={realAccountId}
				realConversations={realConversations}
			/>
		</>
	);
}
