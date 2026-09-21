'use client';

import Input from '@/components/atoms/Input';
import { MEASUREMENT_FIELDS } from './measurement-fields';

export default function MeasurementEditor({ values, onChange, t }) {
	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
			<div className="border-b border-slate-100 px-5 py-4 sm:px-7">
				<h2 className="text-lg font-black text-slate-900">{t('editor.title')}</h2>
				<p className="mt-1 text-xs text-slate-500">{t('editor.subtitle')}</p>
			</div>
			<div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-7">
				{MEASUREMENT_FIELDS.map(({ key }) => (
					<Input
						key={key}
						type="number"
						label={t(`fields.${key}`)}
						placeholder={t('editor.placeholder')}
						value={values[key] ?? ''}
						onChange={(next) => onChange(key, next)}
					/>
				))}
			</div>
		</div>
	);
}
