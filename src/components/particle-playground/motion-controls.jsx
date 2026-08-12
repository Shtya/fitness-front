'use client';

import { Switch } from '@/components/ui/switch';
import { ControlRow, LabelWithHelp, Section } from './control-row';
import { CONTROL_RANGES } from '@/lib/particle-playground/particle-config';
import { helpFor } from '@/lib/particle-playground/control-help-ar';

const TOGGLES = [
	['autoRotate', 'Auto Rotate'],
	['orbit', 'Orbit'],
	['zoom', 'Zoom'],
];

export function MotionControls({ config, onChange }) {
	return (
		<Section title="Motion">
			<ControlRow label="Drift" value={config.drift} {...CONTROL_RANGES.drift} help={helpFor('drift')} onChange={(drift) => onChange({ drift })} />
			<ControlRow label="Float Intensity" value={config.floatIntensity} {...CONTROL_RANGES.floatIntensity} help={helpFor('floatIntensity')} onChange={(floatIntensity) => onChange({ floatIntensity })} />
			<ControlRow label="Float Speed" value={config.floatSpeed} {...CONTROL_RANGES.floatSpeed} help={helpFor('floatSpeed')} onChange={(floatSpeed) => onChange({ floatSpeed })} />
			<ControlRow label="Rotation Intensity" value={config.rotationIntensity} {...CONTROL_RANGES.rotationIntensity} help={helpFor('rotationIntensity')} onChange={(rotationIntensity) => onChange({ rotationIntensity })} />
			{TOGGLES.map(([key, label]) => (
				<div key={key} className="flex items-center justify-between gap-3">
					<LabelWithHelp help={helpFor(key)}>{label}</LabelWithHelp>
					<Switch checked={!!config[key]} onCheckedChange={(v) => onChange({ [key]: v })} />
				</div>
			))}
			{config.autoRotate ? (
				<ControlRow
					label="Auto Rotate Speed"
					value={config.autoRotateSpeed}
					{...CONTROL_RANGES.autoRotateSpeed}
					help={helpFor('autoRotateSpeed')}
					onChange={(autoRotateSpeed) => onChange({ autoRotateSpeed })}
				/>
			) : null}
		</Section>
	);
}
