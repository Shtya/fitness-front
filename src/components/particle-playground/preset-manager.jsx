'use client';

import { Button } from '@/components/ui/button';

export function PresetManager({
	onSave,
	onLoad,
	onDuplicate,
	onDelete,
}) {
	return (
		<div className="flex flex-wrap gap-1.5">
			<Button type="button" size="sm" className="h-7 text-[10px]" onClick={onSave}>
				Save Preset
			</Button>
			<Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={onLoad}>
				Load Preset
			</Button>
			<Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={onDuplicate}>
				Duplicate Preset
			</Button>
			<Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={onDelete}>
				Delete Preset
			</Button>
		</div>
	);
}
