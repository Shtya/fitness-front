'use client';

import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { saveFilesToDevice } from './wa-save-file';

const SAVE_PROMPT_ID = 'wa-save-media-prompt';

function promptCopy(locale, count) {
	const ar = locale === 'ar';
	if (ar) {
		return {
			title: count > 1 ? `${count} ملفات جاهزة` : 'الملف جاهز',
			action: 'حفظ',
			failed: 'تعذر حفظ الملف',
		};
	}
	return {
		title: count > 1 ? `${count} files ready` : 'File ready',
		action: 'Save',
		failed: 'Could not save the file',
	};
}

/**
 * Saves original media files. When Safari drops the tap's activation while the
 * bytes were downloading, a one-tap prompt opens the Share Sheet from a new tap.
 */
export async function saveMediaFiles(files, { locale = 'en' } = {}) {
	const result = await saveFilesToDevice(files);
	if (result.status !== 'needs-gesture') return result;

	const list = Array.isArray(files) ? files : [files];
	const copy = promptCopy(locale, list.length);
	toast(
		item => (
			<div className="flex items-center gap-3" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
				<span className="text-sm font-medium">{copy.title}</span>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 rounded-full bg-[#00a884] px-3 py-1.5 text-sm font-semibold text-white"
					onClick={() => {
						toast.dismiss(item.id);
						saveFilesToDevice(list)
							.then(next => {
								if (next.status === 'needs-gesture') toast.error(copy.failed);
							})
							.catch(() => toast.error(copy.failed));
					}}
				>
					<Download size={15} strokeWidth={2.2} aria-hidden="true" />
					{copy.action}
				</button>
			</div>
		),
		{ id: SAVE_PROMPT_ID, duration: 20_000 },
	);
	return result;
}
