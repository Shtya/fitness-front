'use client';

import { ControlRow, Section } from './control-row';
import { CONTROL_RANGES } from '@/lib/particle-playground/particle-config';
import { helpFor } from '@/lib/particle-playground/control-help-ar';

export function ParticleControls({ config, onChange }) {
	return (
		<Section title="Particles">
			<ControlRow
				label="Particle Count"
				value={config.count}
				{...CONTROL_RANGES.count}
				help={helpFor('count')}
				onChange={(count) => onChange({ count })}
			/>
			<ControlRow
				label="Particle Size"
				value={config.size}
				{...CONTROL_RANGES.size}
				help={helpFor('size')}
				onChange={(size) => onChange({ size })}
			/>
			<ControlRow
				label="Size Variance"
				value={config.sizeVariance}
				{...CONTROL_RANGES.sizeVariance}
				help={helpFor('sizeVariance')}
				onChange={(sizeVariance) => onChange({ sizeVariance })}
			/>
		</Section>
	);
}
