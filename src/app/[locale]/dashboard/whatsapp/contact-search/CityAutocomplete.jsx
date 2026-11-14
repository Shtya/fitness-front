'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, MapPin, X } from 'lucide-react';
import { cityLabel, normalizePlace, suggestCities } from './city-aliases';

/**
 * City input with Arabic/English fuzzy suggestions.
 * value: { text: string, city: CityAlias | null }
 */
export default function CityAutocomplete({ value, onChange, countryCode, ar, placeholder }) {
	const listId = useId();
	const wrapRef = useRef(null);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const text = value?.text || '';
	const city = value?.city || null;

	const suggestions = useMemo(
		() => (city ? [] : suggestCities(text, { limit: 6, countryCode })),
		[text, city, countryCode],
	);

	useEffect(() => setActive(0), [text]);

	useEffect(() => {
		if (!open) return undefined;
		const onDown = (event) => {
			if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
		};
		document.addEventListener('pointerdown', onDown);
		return () => document.removeEventListener('pointerdown', onDown);
	}, [open]);

	const pick = (next) => {
		onChange({ text: ar ? next.ar[0] : next.en[0], city: next });
		setOpen(false);
	};

	/** Typing an exact known spelling and leaving the field still counts as picking it. */
	const autoPickExact = () => {
		if (city || !text.trim()) return;
		const key = normalizePlace(text);
		const exact = suggestions.find((item) => [...item.ar, ...item.en].some((alias) => normalizePlace(alias) === key));
		if (exact) pick(exact);
	};

	const onKeyDown = (event) => {
		if (!suggestions.length) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setOpen(true);
			setActive((i) => (i + 1) % suggestions.length);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
		} else if (event.key === 'Enter' && open) {
			event.preventDefault();
			pick(suggestions[active]);
		} else if (event.key === 'Escape') {
			setOpen(false);
		}
	};

	const showList = open && suggestions.length > 0;

	return (
		<div className="wa-sf__city" ref={wrapRef}>
			<label className={`wa-sf__field${city ? ' is-resolved' : ''}`}>
				<MapPin size={14} aria-hidden />
				<span className="wa-sf__field-tag">{ar ? 'المدينة' : 'City'}</span>
				<input
					role="combobox"
					aria-expanded={showList}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-activedescendant={showList ? `${listId}-${active}` : undefined}
					value={text}
					placeholder={placeholder}
					autoComplete="off"
					onChange={(event) => {
						onChange({ text: event.target.value, city: null });
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onBlur={autoPickExact}
					onKeyDown={onKeyDown}
				/>
				{city ? <Check size={14} className="wa-sf__field-ok" aria-hidden /> : null}
				{text ? (
					<button
						type="button"
						className="wa-sf__field-clear"
						aria-label={ar ? 'مسح المدينة' : 'Clear city'}
						onClick={() => onChange({ text: '', city: null })}
					>
						<X size={12} aria-hidden />
					</button>
				) : null}
			</label>

			{showList ? (
				<ul className="wa-sf__suggest" id={listId} role="listbox">
					{suggestions.map((item, index) => (
						<li
							key={item.id}
							id={`${listId}-${index}`}
							role="option"
							aria-selected={index === active}
							className={index === active ? 'is-active' : ''}
							onPointerDown={(event) => {
								event.preventDefault();
								pick(item);
							}}
							onPointerEnter={() => setActive(index)}
						>
							<span className="wa-sf__suggest-main">{cityLabel(item, ar)}</span>
							<span className="wa-sf__suggest-alt" dir="auto">
								{ar ? item.en[0] : item.ar[0]}
								<em>{item.cc}</em>
							</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
