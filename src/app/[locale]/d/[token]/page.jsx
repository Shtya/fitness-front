'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import MarkdownVisualEditor from '@/components/smart-document/MarkdownVisualEditor';
import { detectDominantDir } from '@/lib/smart-document/structure';
import { FONT_VARIABLE_CLASSES, normalizeTypography, typographyStyle } from '@/components/smart-document/typography';
import '@/components/smart-document/smart-document.css';

const SAVE_MS = 1000;

export default function SharedSmartDocumentPage() {
	const params = useParams();
	const token = String(params?.token || '');
	const locale = useLocale();
	const t = useTranslations('documentEditor');

	const [ready, setReady] = useState(false);
	const [missing, setMissing] = useState(false);
	const [title, setTitle] = useState('');
	const [text, setText] = useState('');
	const [docDir, setDocDir] = useState('ltr');
	const [typography, setTypography] = useState(normalizeTypography(null));
	const [docVersion, setDocVersion] = useState(0);
	const [savedFlash, setSavedFlash] = useState(false);
	const [saving, setSaving] = useState(false);

	const textRef = useRef('');
	const saveTimer = useRef(null);
	const shellStyle = useMemo(() => typographyStyle(typography), [typography]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const { data } = await api.get(`/smart-documents/public/${encodeURIComponent(token)}`, {
					skipAuthRedirect: true,
				});
				if (cancelled) return;
				const content = String(data?.content || '');
				textRef.current = content;
				setText(content);
				setTitle(String(data?.title || t('untitled')));
				setDocDir(detectDominantDir(content));
				setTypography(normalizeTypography(data?.typography || null));
				setDocVersion((v) => v + 1);
				setReady(true);
			} catch {
				if (!cancelled) {
					setMissing(true);
					setReady(true);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [token, t]);

	const persist = useCallback(
		async (next) => {
			setSaving(true);
			try {
				await api.put(
					`/smart-documents/public/${encodeURIComponent(token)}`,
					{ content: next },
					{ skipAuthRedirect: true },
				);
				setSavedFlash(true);
				window.setTimeout(() => setSavedFlash(false), 1200);
			} catch {
				toast.error(locale === 'ar' ? 'تعذر حفظ التعديلات' : 'Could not save changes');
			} finally {
				setSaving(false);
			}
		},
		[token, locale],
	);

	const scheduleSave = useCallback(
		(next) => {
			if (saveTimer.current) clearTimeout(saveTimer.current);
			saveTimer.current = setTimeout(() => {
				void persist(next);
			}, SAVE_MS);
		},
		[persist],
	);

	const applyText = useCallback(
		(next) => {
			textRef.current = next;
			setText(next);
			setDocDir(detectDominantDir(next));
			scheduleSave(next);
		},
		[scheduleSave],
	);

	useEffect(() => {
		return () => {
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, []);

	useEffect(() => {
		if (title) document.title = title;
	}, [title]);

	if (!ready) {
		return (
			<div className={`sd-shell sd-shell--md sd-shell--shared ${FONT_VARIABLE_CLASSES}`}>
				<div className="sd-loading flex items-center justify-center gap-2">
					<Loader2 size={16} className="animate-spin" />
					{t('loading')}
				</div>
			</div>
		);
	}

	if (missing) {
		return (
			<div className={`sd-shell sd-shell--md sd-shell--shared ${FONT_VARIABLE_CLASSES}`}>
				<div className="sd-loading">{t('shareMissing')}</div>
			</div>
		);
	}

	return (
		<div
			className={`sd-shell sd-shell--md sd-shell--shared is-ready ${FONT_VARIABLE_CLASSES}`}
			dir={docDir}
			style={shellStyle}
		>
			<div className="sd-main">
				<header className="sd-chrome sd-chrome--shared">
					<div className="sd-chrome-lead">
						<span className="sd-badge truncate max-w-[min(70vw,28rem)]" title={title}>
							{title || t('untitled')}
						</span>
					</div>
					<div className="sd-chrome-actions">
						<div className="sd-stats" aria-live="polite">
							{saving ? (
								<span className="inline-flex items-center gap-1.5">
									<Loader2 size={12} className="animate-spin" />
									{t('shareSaving')}
								</span>
							) : savedFlash ? (
								<span className="sd-saved">{t('saved')}</span>
							) : (
								<span className="opacity-60">{t('shareHint')}</span>
							)}
						</div>
					</div>
				</header>
				<div className="sd-canvas sd-canvas--bleed is-preview">
					<MarkdownVisualEditor
						key={docVersion}
						markdown={text}
						onChange={applyText}
						onBlur={() => {
							if (saveTimer.current) clearTimeout(saveTimer.current);
							void persist(textRef.current);
						}}
						placeholder={t('previewEmpty')}
						dir={docDir}
						autoFocus={false}
					/>
				</div>
			</div>
		</div>
	);
}
