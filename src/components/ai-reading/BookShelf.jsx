'use client';

import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';

export function BookCover({ book, onOpen, onEdit, onDelete, className = '' }) {
	const [c1, c2] = book.coverGradient || ['#1a2e28', '#3d5a4c'];
	const percent = book.progress?.percent || 0;

	return (
		<motion.article
			whileHover={{ y: -3 }}
			transition={{ type: 'spring', stiffness: 280, damping: 20 }}
			className={`group relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-xl p-2.5 text-[#f6f1e8] sm:rounded-2xl sm:p-3.5 ${className}`}
			style={{
				background: `linear-gradient(160deg, ${c1}, ${c2})`,
				boxShadow: '0 8px 20px rgba(26,46,40,0.18)',
			}}
		>
			<button type="button" onClick={() => onOpen?.(book.id)} className="absolute inset-0 z-0" aria-label={book.title} />

			{(onEdit || onDelete) && (
				<div className="relative z-10 flex justify-end gap-0.5 opacity-100 sm:gap-1 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
					{onEdit && (
						<button
							type="button"
							onClick={e => {
								e.stopPropagation();
								onEdit(book);
							}}
							className="rounded-md bg-black/30 p-1 backdrop-blur-sm hover:bg-black/45 sm:rounded-lg sm:p-1.5"
							aria-label="Edit"
						>
							<Pencil size={11} />
						</button>
					)}
					{onDelete && (
						<button
							type="button"
							onClick={e => {
								e.stopPropagation();
								onDelete(book.id);
							}}
							className="rounded-md bg-black/30 p-1 backdrop-blur-sm hover:bg-rose-500/80 sm:rounded-lg sm:p-1.5"
							aria-label="Delete"
						>
							<Trash2 size={11} />
						</button>
					)}
				</div>
			)}

			<button
				type="button"
				onClick={() => onOpen?.(book.id)}
				className="relative z-10 flex min-h-0 flex-1 flex-col justify-between text-start"
			>
				<div className="min-h-0">
					<p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/55 sm:text-[10px] sm:tracking-[0.18em]">
						{book.source === 'imported' ? 'Import' : book.source === 'generated' ? 'AI' : 'Book'}
					</p>
					<h3 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold leading-snug line-clamp-3 sm:mt-1.5 sm:text-[14px] sm:line-clamp-4">
						{book.title}
					</h3>
				</div>
				<div className="mt-1.5 shrink-0">
					<p className="text-[8px] text-white/60 line-clamp-1 sm:text-[10px]">{book.author}</p>
					<div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/20 sm:mt-2 sm:h-1">
						<div className="h-full rounded-full bg-[#e8c07a]" style={{ width: `${percent}%` }} />
					</div>
				</div>
			</button>
		</motion.article>
	);
}

export function BookShelf({ books, emptyLabel, onOpen, onEdit, onDelete }) {
	if (!books?.length) {
		return (
			<div className="rounded-2xl border border-dashed border-[#2d4a3e]/20 bg-white/40 px-4 py-12 text-center text-sm text-[#5c6b63] sm:rounded-3xl sm:px-6 sm:py-16">
				{emptyLabel}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{books.map(book => (
				<BookCover key={book.id} book={book} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
			))}
		</div>
	);
}
