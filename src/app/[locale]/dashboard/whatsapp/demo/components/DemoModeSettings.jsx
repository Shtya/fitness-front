'use client';

import { useState } from 'react';
import { FlaskConical, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getDemoLabels } from '../demo-translations';
import { useDemoMode } from '../DemoModeProvider';
import DemoProfilePicker from './DemoProfilePicker';
import DemoStudio from './DemoStudio';

export default function DemoModeSettings({ locale, realAccountId, realConversations = [] }) {
	const demo = useDemoMode();
	const labels = getDemoLabels(locale);
	const [studioOpen, setStudioOpen] = useState(false);

	return (
		<>
			<section
				dir={labels.dir}
				className="rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50/80 to-emerald-50/60 p-4 dark:border-violet-900/60 dark:from-violet-950/20 dark:to-emerald-950/10"
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex gap-3">
						<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
							<FlaskConical size={19} />
						</span>
						<div>
							<h2 className="font-black">{labels.demoMode}</h2>
							<p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
								{labels.demoModeHint}
							</p>
						</div>
					</div>
					<div className="flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/75 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
						<span
							className={`text-xs font-black ${
								demo.settings.enabled ? 'text-emerald-600' : 'text-slate-400'
							}`}
						>
							{demo.settings.enabled ? labels.enabled : labels.disabled}
						</span>
						<Switch
							aria-label={labels.enableDemo}
							checked={Boolean(demo.settings.enabled)}
							disabled={demo.loading || demo.saving || !demo.settings.activeProfileId}
							onCheckedChange={value => void demo.setEnabled(value)}
						/>
					</div>
				</div>

				{demo.error && (
					<p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950/20">
						{demo.error}
					</p>
				)}

				<div className="mt-4 grid gap-4 lg:grid-cols-2">
					<div className="rounded-xl border border-white/80 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/70">
						<p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
							{labels.profile}
						</p>
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
					<div className="rounded-xl border border-white/80 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/70">
						<p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
							<Settings2 size={14} />
							{labels.featureFlags}
						</p>
						<div className="grid gap-2 sm:grid-cols-2">
							{[
								'useFakeContacts',
								'useFakeTyping',
								'useFakeMessages',
								'overlayRealChats',
								'randomTyping',
								'randomDelays',
								'hideDemoBadge',
							].map(flag => (
								<label
									key={flag}
									className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs font-bold dark:border-slate-800"
								>
									<span>{labels[flag]}</span>
									<Switch
										checked={demo.settings.featureFlags[flag] !== false}
										disabled={demo.saving}
										onCheckedChange={value => void demo.setFeatureFlag(flag, value)}
									/>
								</label>
							))}
						</div>
					</div>
				</div>
				<div className="mt-4 flex justify-end">
					<Button
						type="button"
						onClick={() => setStudioOpen(true)}
						disabled={!demo.settings.activeProfileId}
					>
						<FlaskConical />
						{labels.openStudio}
					</Button>
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
