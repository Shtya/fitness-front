'use client';

import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ControlRow, LabelWithHelp, Section } from './control-row';
import {
	CONTROL_RANGES,
	INTERACTION_MODES,
} from '@/lib/particle-playground/particle-config';
import { helpFor } from '@/lib/particle-playground/control-help-ar';

export function InteractionControls({ config, onChange }) {
	return (
		<Section title="Interaction">
			<div className="flex items-center justify-between gap-3">
				<LabelWithHelp help={helpFor('cursorEnabled')}>
					Enable Cursor Interaction
				</LabelWithHelp>
				<Switch
					checked={!!config.cursorEnabled}
					onCheckedChange={(cursorEnabled) => onChange({ cursorEnabled })}
				/>
			</div>
			<div className="space-y-1.5">
				<LabelWithHelp help={helpFor('interactionMode')}>Interaction Mode</LabelWithHelp>
				<Select
					value={config.interactionMode || 'push'}
					onValueChange={(interactionMode) => onChange({ interactionMode })}
				>
					<SelectTrigger className="h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-200">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{INTERACTION_MODES.map((mode) => (
							<SelectItem key={mode.id} value={mode.id} title={helpFor(mode.id === 'swirl' ? 'swirlMode' : mode.id === 'orbit' ? 'orbitMode' : mode.id)}>
								{mode.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<ControlRow label="Cursor Radius" value={config.radius} {...CONTROL_RANGES.radius} help={helpFor('radius')} onChange={(radius) => onChange({ radius })} />
			<ControlRow label="Strength" value={config.strength} {...CONTROL_RANGES.strength} help={helpFor('strength')} onChange={(strength) => onChange({ strength })} />
			<ControlRow label="Swirl" value={config.swirl} {...CONTROL_RANGES.swirl} help={helpFor('swirl')} onChange={(swirl) => onChange({ swirl })} />
			<ControlRow label="Spring" value={config.spring} {...CONTROL_RANGES.spring} help={helpFor('spring')} onChange={(spring) => onChange({ spring })} />
			<ControlRow label="Damping" value={config.damping} {...CONTROL_RANGES.damping} help={helpFor('damping')} onChange={(damping) => onChange({ damping })} />
		</Section>
	);
}
