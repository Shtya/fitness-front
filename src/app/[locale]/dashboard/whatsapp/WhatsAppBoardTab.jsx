'use client';

import { useWhatsAppBoardApi } from './useWhatsAppBoardApi';
import WhatsAppTasksBoard from './WhatsAppTasksBoard';

function BoardSkeleton({ locale = 'en' }) {
	const ar = locale === 'ar';
	return (
		<div
			className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-1 sm:px-2"
			dir={ar ? 'rtl' : 'ltr'}
			aria-busy="true"
			aria-label={ar ? 'جارِ تحميل لوحة المهام' : 'Loading tasks board'}
		>
			<style>{`
				@keyframes wa-board-skel {
					0% { background-position: 100% 0; }
					100% { background-position: -100% 0; }
				}
				.wa-board-skel {
					background: linear-gradient(90deg, #eef1f5 0%, #f7f8fa 40%, #eef1f5 80%);
					background-size: 200% 100%;
					animation: wa-board-skel 1.15s ease-in-out infinite;
				}
			`}</style>

			<header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-1 sm:pt-2">
				<div className="space-y-2">
					<div className="wa-board-skel h-6 w-40 rounded-lg" />
					<div className="wa-board-skel h-3.5 w-64 max-w-full rounded-md" />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="wa-board-skel h-9 w-[280px] max-w-full rounded-lg" />
					<div className="wa-board-skel h-9 w-[130px] rounded-lg" />
					<div className="wa-board-skel h-9 w-[80px] rounded-lg" />
					<div className="wa-board-skel h-9 w-[96px] rounded-lg" />
				</div>
			</header>

			<section className="mt-3 grid shrink-0 grid-cols-3 gap-x-4 gap-y-3 rounded-xl border border-[#e7eaef] bg-white px-4 py-3 sm:grid-cols-[minmax(220px,1.6fr)_repeat(3,minmax(0,1fr))]">
				<div className="col-span-3 space-y-2 sm:col-span-1">
					<div className="wa-board-skel h-3 w-24 rounded" />
					<div className="wa-board-skel h-6 w-12 rounded" />
					<div className="wa-board-skel h-1.5 w-full rounded-full" />
				</div>
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index} className="space-y-2 sm:border-s sm:border-[#eef1f4] sm:ps-4">
						<div className="wa-board-skel h-3 w-20 rounded" />
						<div className="wa-board-skel h-6 w-10 rounded" />
					</div>
				))}
			</section>

			<div className="mt-4 flex min-h-0 flex-1 items-start gap-4 overflow-hidden pb-3">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={index}
						className="flex w-[288px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#e7eaef] bg-[#f6f7f9]"
					>
						<div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3">
							<div className="wa-board-skel h-2 w-2 rounded-full" />
							<div className="wa-board-skel h-3.5 w-24 rounded" />
							<div className="wa-board-skel ms-auto h-3 w-4 rounded" />
						</div>
						<div className="space-y-2 px-2 pb-2">
							{Array.from({ length: index === 0 ? 3 : 2 }).map((__, cardIndex) => (
								<div
									key={cardIndex}
									className="rounded-xl border border-[#e3e7ec] bg-white px-3.5 py-3"
								>
									<div className="flex items-start gap-2.5">
										<div className="wa-board-skel mt-0.5 h-4 w-4 shrink-0 rounded-full" />
										<div className="min-w-0 flex-1 space-y-2">
											<div className="wa-board-skel h-3.5 w-[85%] rounded" />
											<div className="wa-board-skel h-3 w-[55%] rounded" />
										</div>
									</div>
								</div>
							))}
							<div className="wa-board-skel h-9 w-full rounded-lg opacity-60" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function WhatsAppBoardTab({
	accountId,
	locale = 'en',
	onOpenConversation,
	conversationLookup = null,
}) {
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
			<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
				<BoardSkeleton locale={locale} />
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
		<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
			<WhatsAppTasksBoard
				boardApi={board}
				locale={locale}
				onOpenConversation={onOpenConversation}
				conversationLookup={conversationLookup}
			/>
		</div>
	);
}
