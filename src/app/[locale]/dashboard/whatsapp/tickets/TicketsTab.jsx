'use client';

/*
 * Today's tickets (Habits + Wall) as a tab of its own: the only way to reach them on a phone,
 * where the empty chat pane that normally holds the board does not exist. Same store, same
 * board, same undo as the pane.
 */

import { useCallback, useState } from 'react';
import '../wa-chat-idle.css';
import { TicketsBoard, TicketsToast } from './DailyTickets';
import { useDailyTickets } from './use-daily-tickets';

export default function TicketsTab({ locale = 'en' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const store = useDailyTickets();
	const [undoItem, setUndoItem] = useState(null);
	const { remove, restore, indexOf } = store;

	const deleteTicket = useCallback(
		ticket => {
			const index = indexOf(ticket.id);
			remove(ticket.id);
			setUndoItem({ key: `${ticket.id}-${Date.now()}`, items: [{ ...ticket, _index: index }] });
		},
		[remove, indexOf],
	);
	const undoDelete = useCallback(() => {
		if (undoItem) restore(undoItem.items);
		setUndoItem(null);
	}, [restore, undoItem]);

	return (
		<div className="wa-chat-idle has-tickets wa-tickets-tab" dir={ar ? 'rtl' : 'ltr'}>
			<div className="wa-chat-idle__stage">
				<TicketsBoard ar={ar} store={store} onDelete={deleteTicket} leaving={false} focusComposer={false} />
			</div>
			<TicketsToast ar={ar} item={undoItem} onUndo={undoDelete} onDismiss={() => setUndoItem(null)} />
		</div>
	);
}
