'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Save, Trash2 } from 'lucide-react';
import { WaCustomSelect } from '../WaCustomSelect';
import {
	NEW_STICKER_PROMPT_ID,
	SAVE_STICKER_PROMPT_ID,
	deleteSavedStickerPrompt,
	listStickerPromptLibrary,
	saveStickerPrompt,
	stickerPromptSelectOptions,
} from './sticker-prompt-library';

export default function StickerPromptStudio({ locale = 'en', actionBtnClass }) {
	const ar = locale === 'ar';
	const [library, setLibrary] = useState(() => listStickerPromptLibrary());
	const [selectedId, setSelectedId] = useState(library[0]?.id || NEW_STICKER_PROMPT_ID);
	const [title, setTitle] = useState(library[0] ? (ar ? library[0].titleAr : library[0].titleEn) : '');
	const [text, setText] = useState(library[0]?.text || '');
	const [copied, setCopied] = useState(false);

	const refresh = () => setLibrary(listStickerPromptLibrary());
	const selected = useMemo(
		() => library.find(item => item.id === selectedId) || null,
		[library, selectedId],
	);
	const canDelete = selected?.kind === 'saved';

	useEffect(() => {
		refresh();
	}, []);

	const applyItem = item => {
		if (!item) {
			setTitle('');
			setText('');
			return;
		}
		setTitle(ar ? item.titleAr : item.titleEn);
		setText(item.text || item.prompt || '');
	};

	const handleSelect = id => {
		if (id === SAVE_STICKER_PROMPT_ID) {
			void saveCurrent();
			return;
		}
		if (id === NEW_STICKER_PROMPT_ID) {
			setSelectedId(NEW_STICKER_PROMPT_ID);
			setTitle('');
			setText('');
			return;
		}
		setSelectedId(id);
		applyItem(library.find(item => item.id === id));
	};

	const saveCurrent = () => {
		const saved = saveStickerPrompt({ title, text, prompt: text });
		if (!saved) {
			toast.error(ar ? 'اكتب برومبت الأول' : 'Write a prompt first');
			return;
		}
		refresh();
		setSelectedId(saved.id);
		toast.success(ar ? 'تم حفظ البرومبت' : 'Prompt saved');
	};

	const copyCurrent = async () => {
		if (!text.trim()) return;
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			toast.success(ar ? 'تم نسخ البرومبت' : 'Prompt copied');
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			window.prompt(ar ? 'انسخ البرومبت:' : 'Copy this prompt:', text);
		}
	};

	const removeCurrent = () => {
		if (!canDelete) return;
		deleteSavedStickerPrompt(selectedId);
		const next = listStickerPromptLibrary();
		setLibrary(next);
		const fallback = next[0];
		setSelectedId(fallback?.id || NEW_STICKER_PROMPT_ID);
		applyItem(fallback);
		toast.success(ar ? 'تم حذف البرومبت' : 'Prompt deleted');
	};

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
			<WaCustomSelect
				value={selectedId === NEW_STICKER_PROMPT_ID ? NEW_STICKER_PROMPT_ID : selectedId}
				onChange={handleSelect}
				options={stickerPromptSelectOptions(library, ar)}
				ariaLabel={ar ? 'برومبت' : 'Prompt'}
				size="sm"
			/>
			<input
				value={title}
				onChange={event => setTitle(event.target.value)}
				maxLength={80}
				placeholder={ar ? 'اسم البرومبت' : 'Prompt name'}
				className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
			/>
			<textarea
				value={text}
				onChange={event => setText(event.target.value)}
				maxLength={8000}
				placeholder={ar ? 'اكتب البرومبت هنا...' : 'Write the prompt here...'}
				className="min-h-0 flex-1 resize-none overflow-y-auto rounded-xl border border-violet-200 bg-white p-2.5 text-[11px] leading-5 text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
				dir={ar ? 'rtl' : 'ltr'}
			/>
			<div className="flex flex-wrap gap-2">
				<button type="button" onClick={() => void copyCurrent()} className={`${actionBtnClass} bg-emerald-50 text-emerald-700`}>
					{copied ? <Check size={12} /> : <Copy size={12} />}
					{copied ? (ar ? 'تم' : 'Copied') : ar ? 'نسخ' : 'Copy'}
				</button>
				<button type="button" onClick={saveCurrent} className={`${actionBtnClass} bg-violet-50 text-violet-700`}>
					<Save size={12} />
					{ar ? 'حفظ' : 'Save'}
				</button>
				{canDelete ? (
					<button type="button" onClick={removeCurrent} className={`${actionBtnClass} bg-rose-50 text-rose-700`}>
						<Trash2 size={12} />
						{ar ? 'حذف' : 'Delete'}
					</button>
				) : null}
			</div>
		</div>
	);
}
