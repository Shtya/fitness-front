'use client';

import { Loader2 } from 'lucide-react';
import BoardTab from '@/app/[locale]/workspace/BoardTab';
import { useWhatsAppBoardApi } from './useWhatsAppBoardApi';

export function WhatsAppBoardTab({ accountId, locale = 'en', onOpenConversation }) {
	const board = useWhatsAppBoardApi(accountId);

	if (!accountId) {
		return (
			<p className="py-16 text-center text-sm text-slate-500">
				{locale === 'ar' ? 'اختر حساب واتساب أولاً' : 'Select a WhatsApp account first'}
			</p>
		);
	}

	if (board.loading && !board.lists.length) {
		return (
			<div className="flex h-full min-h-[320px] items-center justify-center text-slate-500">
				<Loader2 size={24} className="animate-spin" />
			</div>
		);
	}

	if (board.error && !board.lists.length) {
		return (
			<div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
				<p className="text-sm text-red-600">{board.error}</p>
				<button
					type="button"
					onClick={() => void board.reload()}
					className="rounded-lg bg-[var(--color-primary-500)] px-4 py-2 text-sm font-semibold text-white"
				>
					{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
				</button>
			</div>
		);
	}

	return (
		<BoardTab
			embedded
			accountId={accountId}
			boardApi={board}
			onOpenConversation={onOpenConversation}
		/>
	);
}
