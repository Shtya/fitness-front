'use client';

import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';

export function BookCover({ book, onOpen, onEdit, onDelete, className = '' }) {
	const [c1, c2] = book.coverGradient || ['#1a2e28', '#3d5a4c'];
	const percent = book.progress?.percent || 0;

	return (
		<motion.article
			whileHover={{ y: -4 }}
			transition={{ type: 'spring', stiffness: 280, damping: 20 }}
			className={`group relative flex h-56 w-40 flex-col justify-between overflow-hidden rounded-2xl p-4 text-[#f6f1e8] ${className}`}
			style={{
				background: `linear-gradient(160deg, ${c1}, ${c2})`,
				boxShadow: '0 10px 28px rgba(26,46,40,0.22)',
			}}
		>
			<button type="button" onClick={() => onOpen?.(book.id)} className="absolute inset-0 z-0" aria-label={book.title} />

			{(onEdit || onDelete) && (
				<div className="relative z-10 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
					{onEdit && (
						<button
							type="button"
							onClick={e => {
								e.stopPropagation();
								onEdit(book);
							}}
							className="rounded-lg bg-black/25 p-1.5 backdrop-blur-sm hover:bg-black/40"
							aria-label="Edit"
						>
							<Pencil size={12} />
						</button>
					)}
					{onDelete && (
						<button
							type="button"
							onClick={e => {
								e.stopPropagation();
								onDelete(book.id);
							}}
							className="rounded-lg bg-black/25 p-1.5 backdrop-blur-sm hover:bg-rose-500/80"
							aria-label="Delete"
						>
							<Trash2 size={12} />
						</button>
					)}
				</div>
			)}

			<button type="button" onClick={() => onOpen?.(book.id)} className="relative z-10 flex flex-1 flex-col justify-between text-start">
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
						{book.source === 'imported' ? 'Import' : book.source === 'generated' ? 'AI' : 'Book'}
					</p>
					<h3 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-[15px] font-bold leading-snug line-clamp-4">
						{book.title}
					</h3>
				</div>
				<div>
					<p className="text-[10px] text-white/60 line-clamp-1">{book.author}</p>
					<div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
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
			<div className="rounded-3xl border border-dashed border-[#2d4a3e]/20 bg-white/40 px-6 py-16 text-center text-sm text-[#5c6b63]">
				{emptyLabel}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-5">
			{books.map(book => (
				<BookCover key={book.id} book={book} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
			))}
		</div>
	);
}
