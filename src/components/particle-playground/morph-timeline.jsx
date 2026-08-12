'use client';

import {
	DndContext,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	horizontalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	Pause,
	Play,
	RotateCcw,
	ChevronLeft,
	ChevronRight,
	Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CONTROL_RANGES } from '@/lib/particle-playground/particle-config';
import { easeFunctions } from '@/lib/particle-playground/morph-engine';
import { cn } from '@/lib/utils';
import { LabelWithHelp } from './control-row';
import { helpFor } from '@/lib/particle-playground/control-help-ar';

function SortableTarget({ target, active, onSelect }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
		id: target.id,
	});
	return (
		<button
			ref={setNodeRef}
			type="button"
			style={{ transform: CSS.Transform.toString(transform), transition }}
			{...attributes}
			{...listeners}
			onClick={() => onSelect?.(target.id)}
			className={cn(
				'min-w-[96px] rounded-md border px-2 py-1.5 text-left',
				active
					? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100'
					: 'border-zinc-800 bg-zinc-950 text-zinc-300',
			)}
		>
			<p className="truncate text-[10px] font-semibold uppercase tracking-wide">{target.label}</p>
			<p className="truncate text-[10px] text-zinc-500">{target.name}</p>
		</button>
	);
}

export function MorphTimeline({
	targets = [],
	currentIndex = 0,
	playing = false,
	progress = 0,
	config,
	onChangeConfig,
	onPlayPause,
	onRestart,
	onPrev,
	onNext,
	onReorder,
	onAddTarget,
	onSelectTarget,
	onRemoveTarget,
}) {
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
	const duration = Math.max(targets.length - 1, 1) * (config.morphDuration || 2);
	const pct = targets.length <= 1 ? 0 : (progress / Math.max(targets.length - 1, 1)) * 100;

	return (
		<div className="border-t border-zinc-800 bg-[#0b0b0d] px-3 py-2">
			<div className="mb-2 flex flex-wrap items-center gap-2">
				<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
					Morph timeline
				</p>
				<p className="hidden text-[11px] text-zinc-500 sm:block">
					Select asset → Add Morph Target → Play
				</p>
				<div className="ml-auto flex items-center gap-1">
					<Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-zinc-300" onClick={onPrev} title="Previous (←)">
						<ChevronLeft className="h-3.5 w-3.5" />
					</Button>
					<Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-zinc-300" onClick={onPlayPause} title="Play / Pause (Space)">
						{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
					</Button>
					<Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-zinc-300" onClick={onRestart} title="Restart">
						<RotateCcw className="h-3.5 w-3.5" />
					</Button>
					<Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-zinc-300" onClick={onNext} title="Next (→)">
						<ChevronRight className="h-3.5 w-3.5" />
					</Button>
					<Button
						type="button"
						size="sm"
						className="ml-1 h-7 gap-1 bg-zinc-100 px-2 text-[10px] font-semibold text-zinc-950 hover:bg-white"
						onClick={onAddTarget}
					>
						<Plus className="h-3 w-3" /> Add Morph Target
					</Button>
				</div>
			</div>

			<div className="mb-2">
				<div className="relative h-1.5 overflow-hidden rounded-full bg-zinc-900">
					<div
						className="absolute inset-y-0 left-0 bg-emerald-400/70 transition-[width]"
						style={{ width: `${pct}%` }}
					/>
				</div>
				<div className="mt-1 flex justify-between text-[10px] text-zinc-600">
					<span>0s</span>
					<span>{duration.toFixed(1)}s</span>
				</div>
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={(event) => {
					const { active, over } = event;
					if (!over || active.id === over.id) return;
					const oldIndex = targets.findIndex((t) => t.id === active.id);
					const newIndex = targets.findIndex((t) => t.id === over.id);
					if (oldIndex < 0 || newIndex < 0) return;
					onReorder?.(arrayMove(targets, oldIndex, newIndex));
				}}
			>
				<SortableContext items={targets.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
					<div className="flex gap-2 overflow-x-auto pb-1">
						{targets.map((target, index) => (
							<div key={target.id} className="relative">
								<SortableTarget
									target={{ ...target, label: `Target ${String(index + 1).padStart(2, '0')}` }}
									active={index === currentIndex}
									onSelect={() => onSelectTarget?.(index)}
								/>
								<button
									type="button"
									className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] text-zinc-400"
									onClick={() => onRemoveTarget?.(target.id)}
								>
									×
								</button>
							</div>
						))}
					</div>
				</SortableContext>
			</DndContext>

			<div className="mt-2 grid grid-cols-3 gap-2">
				<div className="space-y-1">
					<LabelWithHelp help={helpFor('morphDuration')} className="text-[10px] normal-case tracking-wide text-zinc-500">
						Morph Duration
					</LabelWithHelp>
					<Input
						type="number"
						value={config.morphDuration}
						min={CONTROL_RANGES.morphDuration.min}
						max={CONTROL_RANGES.morphDuration.max}
						step={CONTROL_RANGES.morphDuration.step}
						onChange={(e) => onChangeConfig?.({ morphDuration: Number(e.target.value) })}
						className="h-7 border-zinc-800 bg-zinc-950 text-xs"
					/>
				</div>
				<div className="space-y-1">
					<LabelWithHelp help={helpFor('morphEasing')} className="text-[10px] normal-case tracking-wide text-zinc-500">
						Easing
					</LabelWithHelp>
					<Select
						value={config.morphEasing || 'power2.inOut'}
						onValueChange={(morphEasing) => onChangeConfig?.({ morphEasing })}
					>
						<SelectTrigger className="h-7 border-zinc-800 bg-zinc-950 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.keys(easeFunctions).map((key) => (
								<SelectItem key={key} value={key}>
									{key}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<LabelWithHelp help={helpFor('morphDelay')} className="text-[10px] normal-case tracking-wide text-zinc-500">
						Delay
					</LabelWithHelp>
					<Input
						type="number"
						value={config.morphDelay}
						min={CONTROL_RANGES.morphDelay.min}
						max={CONTROL_RANGES.morphDelay.max}
						step={CONTROL_RANGES.morphDelay.step}
						onChange={(e) => onChangeConfig?.({ morphDelay: Number(e.target.value) })}
						className="h-7 border-zinc-800 bg-zinc-950 text-xs"
					/>
				</div>
			</div>
		</div>
	);
}
