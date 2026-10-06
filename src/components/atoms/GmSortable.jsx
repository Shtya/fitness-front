'use client';

import { useEffect, useState } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { AlertTriangle, GripVertical, Trash2 } from 'lucide-react';

export const ICON_BTN = 'grid size-8 shrink-0 place-items-center rounded-[9px] gm-faint transition-colors';
export const DANGER_HOVER = 'hover:bg-[color-mix(in_srgb,var(--gm-danger)_10%,transparent)] hover:text-(--gm-danger) focus-visible:text-(--gm-danger)';

export function SortableList({ ids, onMove, children }) {
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);
	const onDragEnd = ({ active, over }) => {
		if (!active?.id || !over?.id || active.id === over.id) return;
		const from = ids.indexOf(active.id);
		const to = ids.indexOf(over.id);
		if (from >= 0 && to >= 0) onMove(from, to);
	};
	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
			<SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext>
		</DndContext>
	);
}

export function useSortableRow(id) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
	return {
		ref: setNodeRef,
		isDragging,
		handle: { ...attributes, ...listeners },
		style: { transform: CSS.Translate.toString(transform), transition, position: 'relative', zIndex: isDragging ? 5 : undefined },
	};
}

export function DragHandle({ handle, label }) {
	return (
		<button
			type='button'
			{...handle}
			aria-label={label}
			title={label}
			className='grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-xl gm-faint transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] hover:text-(--color-primary-600) active:cursor-grabbing'
		>
			<GripVertical className='size-4' />
		</button>
	);
}

export function RemoveButton({ onClick, label }) {
	return (
		<button type='button' onClick={onClick} aria-label={label} title={label} className={`${ICON_BTN} ${DANGER_HOVER}`}>
			<Trash2 className='size-4' />
		</button>
	);
}

export function ConfirmRemove({ onConfirm, label, confirmLabel }) {
	const [armed, setArmed] = useState(false);
	useEffect(() => {
		if (!armed) return undefined;
		const id = setTimeout(() => setArmed(false), 2500);
		return () => clearTimeout(id);
	}, [armed]);

	return (
		<button
			type='button'
			onClick={() => (armed ? onConfirm() : setArmed(true))}
			onBlur={() => setArmed(false)}
			aria-label={armed ? confirmLabel : label}
			title={armed ? confirmLabel : label}
			className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-2 text-[11.5px] font-semibold transition-colors ${armed ? 'bg-[color-mix(in_srgb,var(--gm-danger)_12%,transparent)] text-(--gm-danger)' : `gm-faint ${DANGER_HOVER}`}`}
		>
			{armed ? <AlertTriangle className='size-4' /> : <Trash2 className='size-4' />}
			{armed && <span className='hidden sm:inline'>{confirmLabel}</span>}
		</button>
	);
}
