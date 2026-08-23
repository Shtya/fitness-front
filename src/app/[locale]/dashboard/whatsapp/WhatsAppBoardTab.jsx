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

			<header className="flex shrink-0 flex-col gap-2 pt-1 sm:pt-2">
				<div className="space-y-2">
					<div className="wa-board-skel h-6 w-40 rounded-lg" />
					<div className="wa-board-skel h-3 w-64 max-w-full rounded-md" />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="wa-board-skel h-8 w-[200px] rounded-lg" />
					<div className="wa-board-skel h-8 w-[110px] rounded-lg" />
					<div className="wa-board-skel h-8 w-[120px] rounded-lg" />
					<div className="wa-board-skel ms-auto h-8 w-[100px] rounded-lg" />
				</div>
			</header>

			<section className="mt-2 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
				{Array.from({ length: 5 }).map((_, index) => (
					<div
						key={index}
						className="relative min-h-[76px] rounded-xl border border-[#e8ecf2] bg-white px-3 py-2.5"
					>
						<div className="wa-board-skel absolute start-3 top-4 h-8 w-8 rounded-lg" />
						<div className="ps-[46px] pe-10">
							<div className="wa-board-skel h-2.5 w-16 rounded" />
							<div className="wa-board-skel mt-2 h-4 w-10 rounded" />
							<div className="wa-board-skel mt-2 h-2 w-20 rounded" />
						</div>
					</div>
				))}
			</section>

			<div className="mt-4 flex min-h-0 flex-1 gap-5 overflow-hidden pb-2 sm:mt-5">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={index}
						className="flex h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-[#fbfcfd]"
					>
						<div className="flex shrink-0 items-center gap-2 border-b border-[#f0f2f5] px-2 py-2.5">
							<div className="wa-board-skel h-4 w-4 rounded" />
							<div className="wa-board-skel h-2.5 w-2.5 rounded-full" />
							<div className="wa-board-skel h-3 w-20 rounded" />
							<div className="wa-board-skel ms-auto h-6 w-6 rounded-md" />
						</div>
						<div className="flex-1 space-y-2 px-2 pt-5">
							{Array.from({ length: index === 0 ? 3 : 2 }).map((__, cardIndex) => (
								<div
									key={cardIndex}
									className="rounded-xl border border-[#e8ecf1] bg-white p-2.5"
								>
									<div className="flex items-start gap-2">
										<div className="wa-board-skel mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full" />
										<div className="min-w-0 flex-1 space-y-2">
											<div className="wa-board-skel h-3 w-[85%] rounded" />
											<div className="wa-board-skel h-2.5 w-[55%] rounded" />
										</div>
									</div>
								</div>
							))}
							<div className="mx-0 mt-2 flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-[#d7dee8]">
								<div className="wa-board-skel h-3 w-24 rounded" />
							</div>
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
			/>
		</div>
	);
}
