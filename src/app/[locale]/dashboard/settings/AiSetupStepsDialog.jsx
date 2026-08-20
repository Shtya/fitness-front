'use client';

import { ExternalLink } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export const PROVIDER_LINKS = {
	gemini: [
		{ href: 'https://aistudio.google.com/apikey', labelKey: 'links.studio' },
		{ href: 'https://aistudio.google.com/usage', labelKey: 'links.billing' },
		{ href: 'https://ai.google.dev/gemini-api/docs/pricing', labelKey: 'links.pricing' },
	],
	openai: [
		{ href: 'https://platform.openai.com/api-keys', labelKey: 'links.studio' },
		{ href: 'https://platform.openai.com/settings/organization/billing', labelKey: 'links.billing' },
		{ href: 'https://openai.com/api/pricing', labelKey: 'links.pricing' },
	],
	anthropic: [
		{ href: 'https://console.anthropic.com/settings/keys', labelKey: 'links.studio' },
		{ href: 'https://console.anthropic.com/settings/billing', labelKey: 'links.billing' },
		{ href: 'https://www.anthropic.com/pricing', labelKey: 'links.pricing' },
	],
	groq: [
		{ href: 'https://console.groq.com/keys', labelKey: 'links.studio' },
		{ href: 'https://console.groq.com/settings/billing', labelKey: 'links.billing' },
		{ href: 'https://groq.com/pricing', labelKey: 'links.pricing' },
	],
	openrouter: [
		{ href: 'https://openrouter.ai/keys', labelKey: 'links.studio' },
		{ href: 'https://openrouter.ai/settings/credits', labelKey: 'links.billing' },
		{ href: 'https://openrouter.ai/models', labelKey: 'links.pricing' },
	],
	'llm7-free': [{ href: 'https://llm7.io', labelKey: 'links.docs' }],
	'pollinations-free': [{ href: 'https://pollinations.ai', labelKey: 'links.docs' }],
	'pollinations-image': [{ href: 'https://pollinations.ai', labelKey: 'links.docs' }],
	'ai-free': [],
	'browser-chatgpt': [{ href: 'https://chatgpt.com', labelKey: 'links.docs' }],
};

export function providerLinks(provider) {
	const mapped = PROVIDER_LINKS[provider?.id];
	if (mapped) return mapped;
	return [
		provider?.keyUrl ? { href: provider.keyUrl, labelKey: 'links.studio' } : null,
		provider?.billingUrl ? { href: provider.billingUrl, labelKey: 'links.billing' } : null,
		provider?.pricingUrl ? { href: provider.pricingUrl, labelKey: 'links.pricing' } : null,
	].filter(Boolean);
}

export function providerGuide(t, providerId) {
	if (!providerId) return { intro: [], steps: [] };
	try {
		const raw = t.raw(`keys.guides.${providerId}`);
		if (!raw || typeof raw !== 'object') return { intro: [], steps: [] };
		const intro = Array.isArray(raw.intro) ? raw.intro : raw.intro ? [String(raw.intro)] : [];
		const steps = Array.isArray(raw.steps) ? raw.steps : [];
		return { intro, steps };
	} catch {
		return { intro: [], steps: [] };
	}
}

export function AiSetupStepsDialog({ open, onOpenChange, provider, t }) {
	if (!provider) return null;
	const guide = providerGuide(t, provider.id);
	const links = providerLinks(provider);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md rounded-2xl">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold text-slate-900">
						{t('keys.setupTitle', { name: provider.name })}
					</DialogTitle>
					<DialogDescription className="text-sm text-slate-500">
						{provider.needsKey === false ? t('keys.noKeyHint') : t('keys.setupHint')}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					{guide.intro.map((line) => (
						<p key={line} className="text-sm leading-6 text-slate-600">
							{line}
						</p>
					))}
					{guide.steps.length ? (
						<ol className="space-y-2">
							{guide.steps.map((step, index) => (
								<li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
									<span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
										{index + 1}
									</span>
									<span>{step}</span>
								</li>
							))}
						</ol>
					) : null}
					{links.length ? (
						<div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm">
							{links.map((link) => (
								<a
									key={link.href}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800"
								>
									{t(link.labelKey)}
									<ExternalLink className="h-3.5 w-3.5" />
								</a>
							))}
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
