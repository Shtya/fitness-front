/*
 * Pure helpers shared by the ticket list and the wall: ordering and copy.
 */

/** Your own order, with pinned tickets first. */
export function sortTickets(tickets) {
	return tickets
		.map((t, i) => [t, i])
		.sort(([a, i], [b, j]) => Number(b.pinned) - Number(a.pinned) || i - j)
		.map(([t]) => t);
}

export const COPY = {
	en: {
		status: { todo: 'To do', doing: 'In progress', done: 'Done' },
		priority: { high: 'High', medium: 'Medium', low: 'Low' },
		priorityLong: { high: 'High priority', medium: 'Medium priority', low: 'Low priority' },
		filterPriority: 'Priority',
		menu: 'Ticket actions',
		markDone: 'Mark as done',
		reopen: 'Reopen',
		start: 'Start working',
		backToTodo: 'Move back to To do',
		pin: 'Pin to top',
		unpin: 'Unpin',
		pinned: 'Pinned',
		edit: 'Edit',
		moveEarlier: 'Move earlier',
		moveLater: 'Move later',
		del: 'Delete',
		dragHint: 'Drag to reorder',
		saveError: 'This browser isn’t saving your tickets, so they’ll be gone after a refresh. Check that site storage is allowed.',
		dismiss: 'Dismiss',
	},
	ar: {
		status: { todo: 'لسه', doing: 'شغّال عليها', done: 'خلصت' },
		priority: { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' },
		priorityLong: { high: 'أولوية عالية', medium: 'أولوية متوسطة', low: 'أولوية منخفضة' },
		filterPriority: 'الأولوية',
		menu: 'إجراءات التذكرة',
		markDone: 'علّمها خلصت',
		reopen: 'رجّعها مفتوحة',
		start: 'ابدأ فيها',
		backToTodo: 'رجّعها «لسه»',
		pin: 'ثبّتها فوق',
		unpin: 'إلغاء التثبيت',
		pinned: 'مثبّتة',
		edit: 'تعديل',
		moveEarlier: 'قدّمها',
		moveLater: 'أخّرها',
		del: 'حذف',
		dragHint: 'اسحب لإعادة الترتيب',
		saveError: 'المتصفح ده مش بيحفظ التذاكر، فهتضيع بعد التحديث. اتأكد إن تخزين الموقع مسموح.',
		dismiss: 'إغلاق',
	},
};
