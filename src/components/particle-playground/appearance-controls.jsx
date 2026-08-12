'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { LabelWithHelp, Section } from './control-row';
import { helpFor } from '@/lib/particle-playground/control-help-ar';

export function AppearanceControls({ config, onChange }) {
	return (
		<Section title="Appearance" defaultOpen={false}>
			<div className="flex items-center justify-between gap-3">
				<LabelWithHelp help={helpFor('useOriginalColors')}>
					Use Original Image Colors
				</LabelWithHelp>
				<Switch
					checked={config.useOriginalColors !== false && !config.color}
					onCheckedChange={(on) =>
						onChange(on ? { useOriginalColors: true, color: '' } : { useOriginalColors: false })
					}
				/>
			</div>
			<div className="space-y-1.5">
				<LabelWithHelp help={helpFor('color')}>Particle Color</LabelWithHelp>
				<div className="flex items-center gap-2">
					<input
						type="color"
						value={config.color || '#76b900'}
						onChange={(e) => onChange({ color: e.target.value, useOriginalColors: false })}
						className="h-8 w-10 cursor-pointer rounded border border-zinc-800 bg-transparent"
					/>
					<Input
						value={config.color || ''}
						placeholder="empty = original"
						onChange={(e) =>
							onChange({
								color: e.target.value,
								useOriginalColors: !e.target.value,
							})
						}
						className="h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-200"
					/>
				</div>
			</div>
			<div className="space-y-1.5">
				<LabelWithHelp help={helpFor('background')}>Background Color</LabelWithHelp>
				<div className="flex items-center gap-2">
					<input
						type="color"
						value={config.background || '#000000'}
						onChange={(e) => onChange({ background: e.target.value })}
						className="h-8 w-10 cursor-pointer rounded border border-zinc-800 bg-transparent"
					/>
					<Input
						value={config.background || ''}
						placeholder="empty = transparent"
						onChange={(e) => onChange({ background: e.target.value })}
						className="h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-200"
					/>
				</div>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full border-zinc-800 bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
				onClick={() => onChange({ color: '', useOriginalColors: true })}
			>
				Reset Color
			</Button>
		</Section>
	);
}
