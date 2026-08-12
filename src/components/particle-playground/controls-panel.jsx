'use client';

import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ParticleControls } from './particle-controls';
import { InteractionControls } from './interaction-controls';
import { MotionControls } from './motion-controls';
import { CameraControls } from './camera-controls';
import { AppearanceControls } from './appearance-controls';
import { ControlRow, LabelWithHelp, Section } from './control-row';
import { CONTROL_RANGES } from '@/lib/particle-playground/particle-config';
import { easeFunctions } from '@/lib/particle-playground/morph-engine';
import { helpFor } from '@/lib/particle-playground/control-help-ar';

export function ControlsPanel({
	config,
	onChange,
	onRebuild,
	presets = [],
	onApplyPreset,
	onSavePreset,
	onDeletePreset,
}) {
	return (
		<div className="flex h-full flex-col">
			<div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">
				<ParticleControls config={config} onChange={onChange} />
				<InteractionControls config={config} onChange={onChange} />
				<MotionControls config={config} onChange={onChange} />
				<CameraControls config={config} onChange={onChange} />
				<AppearanceControls config={config} onChange={onChange} />

				<Section title="Initial Formation" defaultOpen={false}>
					<div className="flex items-center justify-between gap-3">
						<LabelWithHelp help={helpFor('initialFormation')}>
							Initial Formation
						</LabelWithHelp>
						<Switch
							checked={!!config.initialFormation}
							onCheckedChange={(initialFormation) => onChange({ initialFormation })}
						/>
					</div>
					<ControlRow
						label="Formation Duration"
						value={config.formationDuration}
						{...CONTROL_RANGES.formationDuration}
						help={helpFor('formationDuration')}
						onChange={(formationDuration) => onChange({ formationDuration })}
					/>
					<ControlRow
						label="Formation Strength"
						value={config.formationStrength}
						{...CONTROL_RANGES.formationStrength}
						help={helpFor('formationStrength')}
						onChange={(formationStrength) => onChange({ formationStrength })}
					/>
					<div className="space-y-1.5">
						<LabelWithHelp help={helpFor('formationEasing')}>Formation Easing</LabelWithHelp>
						<Select
							value={config.formationEasing || 'power2.out'}
							onValueChange={(formationEasing) => onChange({ formationEasing })}
						>
							<SelectTrigger className="h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-200">
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
				</Section>

				<Section title="Image Processing" defaultOpen={false}>
					<ControlRow label="Alpha Threshold" value={config.alphaThreshold} {...CONTROL_RANGES.alphaThreshold} help={helpFor('alphaThreshold')} onChange={(alphaThreshold) => onChange({ alphaThreshold })} />
					<ControlRow label="Brightness" value={config.brightness} {...CONTROL_RANGES.brightness} help={helpFor('brightness')} onChange={(brightness) => onChange({ brightness })} />
					<ControlRow label="Contrast" value={config.contrast} {...CONTROL_RANGES.contrast} help={helpFor('contrast')} onChange={(contrast) => onChange({ contrast })} />
					<ControlRow label="Scale" value={config.imageScale} {...CONTROL_RANGES.imageScale} help={helpFor('imageScale')} onChange={(imageScale) => onChange({ imageScale })} />
					<div className="flex items-center justify-between gap-3">
						<LabelWithHelp help={helpFor('center')}>Center</LabelWithHelp>
						<Switch checked={config.center !== false} onCheckedChange={(center) => onChange({ center })} />
					</div>
					<div className="flex items-center justify-between gap-3">
						<LabelWithHelp help={helpFor('invertAlpha')}>Invert Alpha</LabelWithHelp>
						<Switch checked={!!config.invertAlpha} onCheckedChange={(invertAlpha) => onChange({ invertAlpha })} />
					</div>
					<Button
						type="button"
						size="sm"
						className="w-full bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-white"
						onClick={() => onRebuild?.()}
					>
						Rebuild Particles
					</Button>
				</Section>

				<Section title="Presets">
					<div className="flex flex-wrap gap-1.5">
						{presets.map((preset) => (
							<Button
								key={preset.id || preset.filename || preset.name}
								type="button"
								size="sm"
								variant="outline"
								className="h-7 border-zinc-800 px-2 text-[10px] text-zinc-300 hover:bg-zinc-900"
								onClick={() => onApplyPreset?.(preset)}
							>
								{preset.name}
							</Button>
						))}
					</div>
					<div className="mt-2 grid grid-cols-2 gap-1.5">
						<Button
							type="button"
							size="sm"
							className="h-8 bg-emerald-500/90 text-xs text-zinc-950 hover:bg-emerald-400"
							onClick={() => onSavePreset?.()}
						>
							Save Preset
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-8 border-zinc-800 text-xs text-zinc-300"
							onClick={() => onDeletePreset?.()}
						>
							Delete Preset
						</Button>
					</div>
				</Section>
			</div>
		</div>
	);
}
