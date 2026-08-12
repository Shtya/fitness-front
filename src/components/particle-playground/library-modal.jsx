'use client';

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { AssetLibrary } from './asset-library';

export function LibraryModal({
	open,
	onOpenChange,
	assets,
	selectedId,
	particleCount,
	onSelect,
	onRename,
	onDelete,
	onDuplicate,
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-md overflow-hidden border-zinc-800 bg-[#0d0d10] text-zinc-100">
				<DialogHeader>
					<DialogTitle className="font-[family-name:var(--font-space-grotesk)]">
						Asset Library
					</DialogTitle>
				</DialogHeader>
				<div className="max-h-[65vh] overflow-y-auto pr-1">
					<AssetLibrary
						assets={assets}
						selectedId={selectedId}
						particleCount={particleCount}
						onSelect={(id) => {
							onSelect?.(id);
							onOpenChange?.(false);
						}}
						onRename={onRename}
						onDelete={onDelete}
						onDuplicate={onDuplicate}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
