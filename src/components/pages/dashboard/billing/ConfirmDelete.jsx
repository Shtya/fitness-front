'use client';

import { AlertCircle, Trash2 } from 'lucide-react';

import { Modal } from '@/components/dashboard/ui/UI';
import Button from '@/components/atoms/Button';

export default function ConfirmDelete({ open, title, subject, message, note, loading, cancelLabel, confirmLabel, onConfirm, onClose }) {
	return (
		<Modal cn='gm-modal-root' panelClassName='gm-modal' open={open} onClose={loading ? undefined : onClose} title={title} maxW='max-w-md'>
			<div
				className='flex items-start gap-3 rounded-[14px] border p-4'
				style={{ borderColor: 'color-mix(in srgb, var(--gm-danger) 25%, transparent)', background: 'color-mix(in srgb, var(--gm-danger) 8%, var(--gm-paper))' }}
			>
				<span className='grid size-9 shrink-0 place-items-center rounded-[11px]' style={{ color: 'var(--gm-danger)', background: 'color-mix(in srgb, var(--gm-danger) 14%, var(--gm-paper))' }}>
					<AlertCircle className='size-[18px]' />
				</span>
				<div className='min-w-0 flex-1'>
					{subject ? <p dir='auto' className='truncate text-[13.5px] font-bold gm-ink'>{subject}</p> : null}
					<p className='mt-1 text-[13px] leading-relaxed gm-ink-soft'>{message}</p>
					{note ? <p className='mt-1.5 text-[12px] font-semibold text-(--gm-warn)'>{note}</p> : null}
				</div>
			</div>
			<div className='gm-modal-foot'>
				<Button color='neutral' name={cancelLabel} onClick={onClose} disabled={loading} />
				<Button color='red' name={confirmLabel} onClick={onConfirm} loading={loading} disabled={loading} icon={<Trash2 className='size-4' />} />
			</div>
		</Modal>
	);
}
