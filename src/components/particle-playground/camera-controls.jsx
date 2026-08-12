'use client';

import { Button } from '@/components/ui/button';
import { ControlRow, Section } from './control-row';
import { CONTROL_RANGES, DEFAULT_PARTICLE_CONFIG } from '@/lib/particle-playground/particle-config';
import { helpFor } from '@/lib/particle-playground/control-help-ar';

export function CameraControls({ config, onChange }) {
	return (
		<Section title="Camera" defaultOpen={false}>
			<ControlRow label="Scale" value={config.scale} {...CONTROL_RANGES.scale} help={helpFor('scale')} onChange={(scale) => onChange({ scale })} />
			<ControlRow label="X Offset" value={config.xOffset} {...CONTROL_RANGES.xOffset} help={helpFor('xOffset')} onChange={(xOffset) => onChange({ xOffset })} />
			<ControlRow label="Y Offset" value={config.yOffset} {...CONTROL_RANGES.yOffset} help={helpFor('yOffset')} onChange={(yOffset) => onChange({ yOffset })} />
			<ControlRow label="FOV" value={config.fov} {...CONTROL_RANGES.fov} help={helpFor('fov')} onChange={(fov) => onChange({ fov })} />
			<ControlRow label="Camera Distance" value={config.cameraDistance} {...CONTROL_RANGES.cameraDistance} help={helpFor('cameraDistance')} onChange={(cameraDistance) => onChange({ cameraDistance })} />
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full border-zinc-800 bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
				onClick={() =>
					onChange({
						scale: DEFAULT_PARTICLE_CONFIG.scale,
						xOffset: DEFAULT_PARTICLE_CONFIG.xOffset,
						yOffset: DEFAULT_PARTICLE_CONFIG.yOffset,
						fov: DEFAULT_PARTICLE_CONFIG.fov,
						cameraDistance: DEFAULT_PARTICLE_CONFIG.cameraDistance,
					})
				}
			>
				Reset Camera
			</Button>
		</Section>
	);
}
