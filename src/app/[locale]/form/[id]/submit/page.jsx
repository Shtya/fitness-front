'use client';

import React, {
	forwardRef,
	useImperativeHandle,
	useRef,
	useEffect,
	useMemo,
	useState,
	useCallback,
} from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from '@/utils/axios';
import {
	FiXCircle,
	FiSend,
	FiCalendar,
	FiAlertCircle,
	FiCheck,
	FiMail,
	FiUser,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { createPortal } from 'react-dom';
import {
	ChevronDown,
	X,
	Check,
	Search,
	Plus,
	Save,
	CircleX,
	AlertCircle,
	Phone as PhoneIcon,
} from 'lucide-react';

// i18n
import { useTranslations } from 'use-intl';

// Atoms
import CheckBox from '@/components/atoms/CheckBox';
import MultiLangText from '@/components/atoms/MultiLangText';

// Theme
import { useTheme } from '@/app/[locale]/theme';


const COUNTRY_META = {
	'+20': {
		iso2: 'EG',
		example: '10 1234 5678',
		min: 10,
		max: 10,
		stripLeadingZero: true,
		allowedStarts: ['10', '11', '12', '15'],
	},
	'+966': {
		iso2: 'SA',
		example: '5 1234 5678',
		min: 9,
		max: 9,
		stripLeadingZero: true,
		allowedStarts: ['5'],
	},
	'+971': {
		iso2: 'AE',
		example: '50 123 4567',
		min: 9,
		max: 9,
		stripLeadingZero: true,
		allowedStarts: ['50', '52', '54', '55', '56'],
	},
	'+962': {
		iso2: 'JO',
		example: '7 9012 3456',
		min: 9,
		max: 9,
		stripLeadingZero: true,
		allowedStarts: ['7'],
	},
	'+964': {
		iso2: 'IQ',
		example: '7 8012 3456',
		min: 10,
		max: 10,
		stripLeadingZero: true,
		allowedStarts: ['7'],
	},
	'+965': {
		iso2: 'KW',
		example: '5000 0000',
		min: 8,
		max: 8,
		stripLeadingZero: false,
		allowedStarts: [],
	},
	'+974': {
		iso2: 'QA',
		example: '3 123 4567',
		min: 8,
		max: 8,
		stripLeadingZero: false,
		allowedStarts: ['3', '5', '6', '7'],
	},
	'+968': {
		iso2: 'OM',
		example: '9 123 4567',
		min: 8,
		max: 8,
		stripLeadingZero: false,
		allowedStarts: ['9'],
	},
	'+1': {
		iso2: 'US',
		example: '555 123 4567',
		min: 10,
		max: 10,
		stripLeadingZero: false,
		allowedStarts: [],
	},
	'+44': {
		iso2: 'GB',
		example: '7123 456789',
		min: 9,
		max: 10,
		stripLeadingZero: true,
		allowedStarts: ['7'],
	},
};

function validateByCountry(countryCode, number, required) {
	const meta = COUNTRY_META[countryCode] || {};
	const digitsOnly = (number || '').replace(/\D/g, '');

	if (!digitsOnly) {
		if (required) return { valid: false, message: 'errors.phoneRequired' };
		return { valid: true, message: '' };
	}

	const countryDigits = countryCode.replace('+', '');
	if (digitsOnly.startsWith(countryDigits)) {
		return { valid: false, message: 'errors.phoneDuplicateCountryCode' };
	}

	if (meta.stripLeadingZero && digitsOnly.startsWith('0')) {
		return { valid: false, message: 'errors.phoneLeadingZero' };
	}

	if (meta.allowedStarts && meta.allowedStarts.length > 0) {
		const okPrefix = meta.allowedStarts.some((prefix) => digitsOnly.startsWith(prefix));
		if (!okPrefix) {
			return { valid: false, message: 'errors.phoneStartInvalid' };
		}
	}

	if (meta.min && digitsOnly.length < meta.min) {
		return { valid: false, message: 'errors.phoneTooShort' };
	}

	if (meta.max && digitsOnly.length > meta.max) {
		return { valid: false, message: 'errors.phoneTooLong' };
	}

	try {
		const phoneNumber = parsePhoneNumberFromString(countryCode + digitsOnly);
		if (!phoneNumber || !phoneNumber.isValid()) {
			return { valid: false, message: 'errors.phoneInvalid' };
		}
	} catch {
		return { valid: false, message: 'errors.phoneInvalid' };
	}

	return { valid: true, message: '' };
}

/** merge refs safely */
function assignRef(ref, value) {
	if (!ref) return;
	if (typeof ref === 'function') ref(value);
	else ref.current = value;
}

/* ---------- PHONE FIELD ---------- */
function PhoneField({
	label,
	value,
	onChange,
	error,
	required,
	name,
	setError,
	clearErrors,
	disabled = false,
	className = '',
}) {
	const { colors } = useTheme();
	const raw = value || '';

	const { countryCode, number } = useMemo(() => {
		if (!raw) return { countryCode: '+20', number: '' };

		if (raw.startsWith('+')) {
			const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
			return {
				countryCode: (match && match[1]) || '+20',
				number: (match && match[2])?.trim() || '',
			};
		}

		return { countryCode: '+20', number: raw };
	}, [raw]);

	const countries = useMemo(
		() => [
			{ id: '+20', label: '🇪🇬 +20' },
			{ id: '+966', label: '🇸🇦 +966' },
			{ id: '+971', label: '🇦🇪 +971' },
			{ id: '+962', label: '🇯🇴 +962' },
			{ id: '+964', label: '🇮🇶 +964' },
			{ id: '+965', label: '🇰🇼 +965' },
			{ id: '+974', label: '🇶🇦 +974' },
			{ id: '+968', label: '🇴🇲 +968' },
			{ id: '+1', label: '🇺🇸 +1' },
			{ id: '+44', label: '🇬🇧 +44' },
		],
		[],
	);

	const currentMeta = COUNTRY_META[countryCode] || {};
	const dynamicPlaceholder = currentMeta.example || '123456789';

	const applyValidation = (code, num) => {
		const { valid, message } = validateByCountry(code, num, required);

		if (!valid && setError && name) {
			setError(name, { type: 'manual', message });
		} else if (valid && clearErrors && name) {
			clearErrors(name);
		}
	};

	const handleCountryChange = (v) => {
		const code = typeof v === 'string' ? v : v?.target?.value;
		const next = number ? `${code} ${number}` : code || '';
		onChange?.(next);
		applyValidation(code, number);
	};

	const handleNumberChange = (e) => {
		const num = e.target.value;
		const next = num ? `${countryCode} ${num}` : countryCode;
		onChange?.(next);
		applyValidation(countryCode, num);
	};

	const hasError = error && error !== 'users';

	return (
		<div className={`w-full relative ${className}`}>
			{label && (
				<label
					className="mb-2 block text-base font-semibold transition-colors"
					style={{ color: colors.primary[700] }}
				>
					{label} {required && <span className="text-rose-500">*</span>}
				</label>
			)}

			<div className="flex gap-3 rtl:flex-row-reverse">
				<div className="min-w-[100px]">
					<InlineSelect
						placeholder="+20"
						clearable={false}
						searchable={false}
						options={countries}
						value={countryCode}
						onChange={handleCountryChange}
						disabled={disabled}
					/>
				</div>

				<div
					dir="ltr"
					className="relative flex items-center rounded-lg border-2 transition-all duration-300 flex-1 group overflow-hidden"
					style={
						hasError
							? {
								borderColor: '#f43f5e',
								backgroundColor: '#fff1f2',
								boxShadow: '0 0 0 4px rgba(244, 63, 94, 0.1)',
							}
							: disabled
								? {
									borderColor: colors.primary[200],
									backgroundColor: colors.primary[50],
									opacity: 0.6,
									cursor: 'not-allowed',
								}
								: {
									borderColor: colors.primary[300],
									backgroundColor: '#ffffff',
								}
					}
				>
					<div
						className="absolute rtl:right-0 ltr:left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-all duration-300"
						style={{
							backgroundColor: hasError
								? 'rgba(244, 63, 94, 0.1)'
								: `${colors.primary[100]}80`,
						}}
					>
						<PhoneIcon
							className="w-5 h-5 transition-all duration-300"
							style={{
								color: hasError ? '#f43f5e' : colors.primary[600],
								strokeWidth: 2.5,
							}}
						/>
					</div>

					<input
						type="tel"
						placeholder={dynamicPlaceholder}
						value={number}
						onChange={handleNumberChange}
						disabled={disabled}
						className="h-[48px] w-full rounded-lg py-3 text-base font-medium outline-none placeholder:font-normal bg-transparent disabled:cursor-not-allowed transition-all duration-300"
						aria-invalid={!!hasError}
						style={{
							paddingLeft: 'calc(3rem)',
							paddingRight: hasError ? 'calc(3rem)' : '1rem',
							color: colors.primary[900],
						}}
					/>

					{hasError && (
						<div
							className="absolute rtl:left-0 ltr:right-0 top-0 bottom-0 w-12 flex items-center justify-center"
							style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
						>
							<AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" style={{ strokeWidth: 2.5 }} />
						</div>
					)}

					<div
						className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-300 opacity-0 group-focus-within:opacity-100"
						style={{
							boxShadow: hasError
								? '0 0 0 4px rgba(244, 63, 94, 0.15)'
								: `0 0 0 4px ${colors.primary[100]}`,
							borderColor: hasError ? '#f43f5e' : colors.primary[500],
						}}
					/>

					{!hasError && (
						<div
							className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-5"
							style={{
								background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
							}}
						/>
					)}
				</div>
			</div>

			{hasError && (
				<div
					className="mt-2 flex items-start gap-2 p-3 rounded-lg border-l-4 transition-all duration-300"
					style={{ backgroundColor: '#fff1f2', borderColor: '#f43f5e' }}
				>
					<AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
					<p className="text-base font-medium text-rose-700">{error}</p>
				</div>
			)}
		</div>
	);
}

/* ---------- TEXTAREA (RHF-safe) ---------- */
const Textarea = forwardRef(function Textarea(
	{
		label,
		placeholder = 'Enter text',
		name,
		rows = 2,
		error = null,
		required = false,
		disabled = false,
		className = '',
		cnLabel = '',
		cnInput = '',
		iconLeft,
		actionIcon,
		onAction,
		registration, // ✅ pass register() here
		onChange,
		onBlur,
		defaultValue,
		...props
	},
	ref,
) {
	const { colors } = useTheme();
	const hasError = !!error;

	const localRef = useRef(null);
	useImperativeHandle(ref, () => localRef.current);

	const reg = registration || {};
	const fieldName = reg.name || name;

	const setRefs = (el) => {
		localRef.current = el;
		assignRef(reg.ref, el);
		assignRef(ref, el);
	};

	const handleChange = (e) => {
		reg.onChange?.(e);
		onChange?.(e);
	};

	const handleBlur = (e) => {
		reg.onBlur?.(e);
		onBlur?.(e);
	};

	return (
		<div className={`w-full ${className}`}>
			{label && (
				<label
					htmlFor={fieldName}
					className={`mb-2 block text-base font-semibold transition-colors ${cnLabel}`}
					style={{ color: colors.primary[700] }}
				>
					{label}
					{required && <span className="text-rose-500 ml-1">*</span>}
				</label>
			)}

			<div
				className={`${cnInput} relative flex items-start rounded-lg border-2 transition-all duration-300 group overflow-hidden`}
				style={
					hasError
						? {
							borderColor: '#f43f5e',
							backgroundColor: '#fff1f2',
							boxShadow: '0 0 0 4px rgba(244, 63, 94, 0.1)',
						}
						: disabled
							? {
								borderColor: colors.primary[200],
								backgroundColor: colors.primary[50],
								opacity: 0.6,
								cursor: 'not-allowed',
							}
							: {
								borderColor: colors.primary[300],
								backgroundColor: '#ffffff',
							}
				}
			>
				{iconLeft && (
					<div
						className="flex-none flex items-center justify-center p-3 transition-all duration-300"
						style={{
							backgroundColor: hasError ? 'rgba(244, 63, 94, 0.1)' : `${colors.primary[100]}80`,
						}}
					>
						<img
							src={iconLeft}
							alt=""
							className="w-5 h-5"
							style={{
								filter: hasError ? 'none' : `brightness(0) saturate(100%) opacity(0.7)`,
							}}
						/>
					</div>
				)}

				<textarea
					ref={setRefs}
					id={fieldName}
					name={fieldName}
					placeholder={placeholder}
					rows={rows}
					disabled={disabled}
					defaultValue={defaultValue}
					className="p-4 w-full bg-transparent outline-none font-medium placeholder:font-normal placeholder:text-slate-400 resize-none transition-all duration-300 disabled:cursor-not-allowed"
					style={{
						color: colors.primary[900],
						paddingRight: actionIcon || hasError ? '3.5rem' : '1rem',
					}}
					onChange={handleChange}
					onBlur={handleBlur}
					{...props}
				/>

				{hasError && !actionIcon && (
					<div
						className="absolute right-0 top-3 w-12 h-12 flex items-center justify-center"
						style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
					>
						<AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" style={{ strokeWidth: 2.5 }} />
					</div>
				)}

				{actionIcon && (
					<button
						type="button"
						onClick={onAction}
						disabled={disabled}
						className="cursor-pointer flex items-center justify-center w-12 h-12 absolute right-2 top-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95"
						style={{
							background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
						}}
					>
						<img src={actionIcon} alt="" className="w-5 h-5 brightness-0 invert" />
					</button>
				)}

				<div
					className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-300 opacity-0 group-focus-within:opacity-100"
					style={{
						boxShadow: hasError
							? '0 0 0 4px rgba(244, 63, 94, 0.15)'
							: `0 0 0 4px ${colors.primary[100]}`,
						borderColor: hasError ? '#f43f5e' : colors.primary[500],
					}}
				/>

				{!hasError && (
					<div
						className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-5"
						style={{
							background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
						}}
					/>
				)}
			</div>

			{hasError && (
				<div
					className="mt-2 flex items-start gap-2 p-3 rounded-lg border-l-4 transition-all duration-300"
					style={{ backgroundColor: '#fff1f2', borderColor: '#f43f5e' }}
				>
					<AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
					<p className="text-base font-medium text-rose-700">{error}</p>
				</div>
			)}
		</div>
	);
});

Textarea.displayName = 'Textarea';

/* ---------- INPUT (RHF-safe) ---------- */
const Input = forwardRef(function Input(
	{
		label,
		placeholder = '',
		name,
		type = 'text',
		disabled = false,
		error,
		clearable = true,
		required = false,
		icon,
		className = '',
		registration, // ✅ pass register() here
		onChange,
		onBlur,
		defaultValue,
		...rest
	},
	ref,
) {
	const { colors } = useTheme();
	const inputRef = useRef(null);
	const [isFocused, setIsFocused] = useState(false);
	const [hasValue, setHasValue] = useState(!!defaultValue);

	useImperativeHandle(ref, () => inputRef.current);

	const reg = registration || {};
	const fieldName = reg.name || name;

	const setRefs = (el) => {
		inputRef.current = el;
		assignRef(reg.ref, el);
		assignRef(ref, el);
	};

	const handleChange = (e) => {
		setHasValue(!!e.target.value);
		reg.onChange?.(e);
		onChange?.(e);
	};

	const handleBlur = (e) => {
		setIsFocused(false);
		reg.onBlur?.(e);
		onBlur?.(e);
	};

	const clearInput = (e) => {
		e.stopPropagation();
		if (!inputRef.current) return;

		inputRef.current.value = '';
		setHasValue(false);

		const synthetic = { target: { name: fieldName, value: '' } };
		// RHF expects an event-like object
		reg.onChange?.(synthetic);
		onChange?.(synthetic);

		inputRef.current.focus();
	};

	return (
		<div className={`w-full relative ${className}`}>
			{label && (
				<label className="mb-2 block text-base font-semibold transition-colors" style={{ color: colors.primary[700] }}>
					{label}
					{required && <span className="text-rose-500 ml-1">*</span>}
				</label>
			)}

			<div
				className="relative flex items-center group rounded-lg border-2 bg-white transition-all duration-300"
				style={
					disabled
						? {
							borderColor: colors.primary[200],
							backgroundColor: colors.primary[50],
							opacity: 0.6,
							cursor: 'not-allowed',
						}
						: error
							? {
								borderColor: '#f43f5e',
								backgroundColor: '#fff1f2',
								boxShadow: isFocused
									? '0 0 0 4px rgba(244, 63, 94, 0.15)'
									: '0 0 0 4px rgba(244, 63, 94, 0.1)',
							}
							: isFocused
								? {
									borderColor: colors.primary[500],
									backgroundColor: '#ffffff',
									boxShadow: `0 0 0 4px ${colors.primary[100]}`,
								}
								: {
									borderColor: colors.primary[300],
									backgroundColor: '#ffffff',
								}
				}
			>
				{icon && (
					<div className="absolute left-4 pointer-events-none">
						<div
							className="transition-colors"
							style={{
								color: error ? '#f43f5e' : isFocused ? colors.primary[500] : colors.primary[400],
							}}
						>
							{icon}
						</div>
					</div>
				)}

				<input
					ref={setRefs}
					type={type}
					name={fieldName}
					placeholder={placeholder}
					disabled={disabled}
					defaultValue={defaultValue}
					onChange={handleChange}
					onBlur={handleBlur}
					onFocus={() => setIsFocused(true)}
					className="h-12 w-full rounded-lg py-3 text-base font-medium outline-none placeholder:text-slate-400 placeholder:font-normal bg-transparent"
					style={{
						paddingLeft: icon ? '3rem' : '1rem',
						paddingRight: clearable && hasValue ? '3rem' : '1rem',
						color: colors.primary[900],
					}}
					{...rest}
				/>

				{clearable && hasValue && !disabled && (
					<motion.button
						type="button"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						onClick={clearInput}
						className="absolute right-4 transition-colors"
						style={{ color: colors.primary[400] }}
					>
						<X size={18} />
					</motion.button>
				)}

				{!error && (
					<div
						className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-5"
						style={{
							background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
						}}
					/>
				)}
			</div>

			{error && (
				<div
					className="mt-2 flex items-start gap-2 p-3 rounded-lg border-l-4 transition-all duration-300"
					style={{ backgroundColor: '#fff1f2', borderColor: '#f43f5e' }}
				>
					<AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
					<p className="text-base font-medium text-rose-700">{error}</p>
				</div>
			)}
		</div>
	);
});

/* ---------- INLINE SELECT ---------- */
function InlineSelect({
	options = [],
	value = null,
	onChange = () => { },
	placeholder,
	searchable = true,
	disabled = false,
	className = '',
}) {
	const { colors } = useTheme();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const buttonRef = useRef(null);
	const listRef = useRef(null);

	const selectedOption = useMemo(
		() => options.find((o) => String(o.id) === String(value)) || null,
		[options, value],
	);

	const buttonLabel = selectedOption?.label || placeholder || 'Select';

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!searchable || !q) return options;
		return options.filter((o) => String(o.label).toLowerCase().includes(q));
	}, [options, query, searchable]);

	const closeMenu = useCallback(() => {
		setOpen(false);
		setQuery('');
	}, []);

	useEffect(() => {
		if (!open) return;
		const onDocClick = (e) => {
			if (buttonRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
			closeMenu();
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [open, closeMenu]);

	const pick = (item) => {
		onChange(item.id);
		closeMenu();
	};

	return (
		<div className={`relative ${className}`}>
			<button
				type="button"
				ref={buttonRef}
				onClick={() => (open ? closeMenu() : setOpen(true))}
				disabled={disabled}
				className="h-12 w-full inline-flex items-center justify-between rounded-lg border-2 bg-white px-4 py-3 text-base font-medium cursor-pointer transition-all duration-300 outline-none"
				style={
					disabled
						? {
							borderColor: colors.primary[200],
							backgroundColor: colors.primary[50],
							opacity: 0.6,
							cursor: 'not-allowed',
						}
						: open
							? {
								borderColor: colors.primary[500],
								boxShadow: `0 0 0 4px ${colors.primary[100]}`,
							}
							: {
								borderColor: colors.primary[300],
								backgroundColor: '#ffffff',
							}
				}
			>
				<span
					className="truncate text-left"
					style={{ color: selectedOption ? colors.primary[900] : colors.primary[400] }}
				>
					{buttonLabel}
				</span>
				<motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
					<ChevronDown className="h-4 w-4" style={{ color: colors.primary[600] }} />
				</motion.div>
			</button>

			{open && (
				<div
					ref={listRef}
					className="absolute z-50 mt-2 w-full max-h-60 overflow-auto rounded-lg border-2 bg-white shadow-2xl"
					style={{ borderColor: colors.primary[200] }}
				>
					<ul className="py-1">
						{filtered.map((item) => {
							const isSelected = selectedOption?.id === item.id;
							return (
								<li
									key={item.id}
									className="mx-1 my-0.5 rounded-lg px-3 py-2 text-base flex items-center justify-between select-none cursor-pointer transition-colors"
									style={{
										backgroundColor: isSelected ? colors.primary[50] : 'transparent',
										color: isSelected ? colors.primary[700] : colors.primary[900],
									}}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => pick(item)}
								>
									<span className="truncate">{item.label}</span>
									{isSelected && <Check className="h-4 w-4" style={{ color: colors.primary[600] }} />}
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}

/* ---------- SELECT ---------- */
function Select({
	options = [],
	value = null,
	onChange = () => { },
	placeholder,
	searchable = true,
	disabled = false,
	clearable = true,
	className = '',
	label,
	allowCustom = false,
	createHint,
	required = false,
	error = '',
}) {
	const { colors } = useTheme();
	const t = useTranslations('publicForm');

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(-1);
	const [createMode, setCreateMode] = useState(false);
	const [createText, setCreateText] = useState('');

	const buttonRef = useRef(null);
	const listRef = useRef(null);
	const createInputRef = useRef(null);
	const [portalReady, setPortalReady] = useState(false);

	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

	const selectedOption = useMemo(
		() => options.find((o) => String(o.id) === String(value)) || null,
		[options, value],
	);

	const buttonLabel = useMemo(() => {
		if (selectedOption) return selectedOption.label;
		if (typeof value === 'string' && value.trim()) return value;
		return placeholder || t('select.placeholder');
	}, [selectedOption, value, placeholder, t]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!searchable || !q) return options;
		return options.filter((o) => String(o.label).toLowerCase().includes(q));
	}, [options, query, searchable]);

	const hasExactMatch = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return false;
		return options.some((o) => String(o.label).toLowerCase() === q);
	}, [options, query]);

	const updateCoords = useCallback(() => {
		if (!buttonRef.current) return;
		const rect = buttonRef.current.getBoundingClientRect();
		setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
	}, []);

	const openMenu = useCallback(() => {
		if (disabled) return;
		updateCoords();
		setOpen(true);
		setTimeout(updateCoords, 0);
	}, [disabled, updateCoords]);

	const closeMenu = useCallback(() => {
		setOpen(false);
		setQuery('');
		setActiveIndex(-1);
		setCreateMode(false);
		setCreateText('');
	}, []);

	useEffect(() => setPortalReady(true), []);

	useEffect(() => {
		if (!open) return;
		const handler = () => updateCoords();
		window.addEventListener('resize', handler);
		window.addEventListener('scroll', handler, true);
		const obs = new ResizeObserver(handler);
		if (buttonRef.current) obs.observe(buttonRef.current);
		return () => {
			window.removeEventListener('resize', handler);
			window.removeEventListener('scroll', handler, true);
			obs.disconnect();
		};
	}, [open, updateCoords]);

	useEffect(() => {
		if (!open) return;
		const onDocClick = (e) => {
			const tEl = e.target;
			if (buttonRef.current?.contains(tEl) || listRef.current?.contains(tEl)) return;
			closeMenu();
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [open, closeMenu]);

	useEffect(() => {
		if (createMode) setTimeout(() => createInputRef.current?.focus(), 0);
	}, [createMode]);

	const scrollIntoView = (index) => {
		const list = listRef.current;
		if (!list) return;
		const offset = searchable ? 1 : 0;
		const item = list.children[index + offset];
		if (!item) return;
		const listRect = list.getBoundingClientRect();
		const itemRect = item.getBoundingClientRect();
		if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top;
		else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom;
	};

	const onKeyDown = (e) => {
		if (!open) {
			if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
				e.preventDefault();
				openMenu();
				setActiveIndex(0);
			}
			return;
		}

		if (createMode) {
			if (e.key === 'Escape') {
				e.preventDefault();
				setCreateMode(false);
				setCreateText('');
			}
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			closeMenu();
			buttonRef.current?.focus();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActiveIndex((i) => {
				const next = Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1);
				scrollIntoView(next);
				return next;
			});
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActiveIndex((i) => {
				const next = Math.max((i < 0 ? filtered.length : i) - 1, 0);
				scrollIntoView(next);
				return next;
			});
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = filtered[activeIndex];
			if (item) {
				onChange(item.id);
				closeMenu();
				buttonRef.current?.focus();
			}
		} else if (e.key === 'Tab') {
			closeMenu();
		}
	};

	const pick = (item) => {
		onChange(item.id);
		closeMenu();
		buttonRef.current?.focus();
	};

	const clear = (e) => {
		e.stopPropagation();
		onChange(null);
		setQuery('');
		setActiveIndex(-1);
	};

	const createFromText = (text) => {
		const tVal = (text ?? '').trim();
		if (!tVal) return;
		onChange(tVal);
		closeMenu();
		buttonRef.current?.focus();
	};

	const errorState = Boolean(error);
	const createHintText = createHint || t('select.create_hint');

	return (
		<div className={`relative ${className}`}>
			{label && (
				<label className="mb-2 block text-base font-semibold" style={{ color: colors.primary[700] }}>
					{label}
					{required && <span className="text-rose-500 ml-1">*</span>}
				</label>
			)}

			<button
				type="button"
				ref={buttonRef}
				onClick={() => (open ? closeMenu() : openMenu())}
				onKeyDown={onKeyDown}
				disabled={disabled}
				className="h-12 group relative w-full inline-flex items-center justify-between rounded-lg border-2 bg-white px-4 py-3 text-base font-medium cursor-pointer transition-all duration-300 outline-none"
				style={
					disabled
						? {
							borderColor: colors.primary[200],
							backgroundColor: colors.primary[50],
							opacity: 0.6,
							cursor: 'not-allowed',
						}
						: errorState
							? {
								borderColor: '#f43f5e',
								backgroundColor: '#fff1f2',
								boxShadow: '0 0 0 4px rgba(244, 63, 94, 0.1)',
							}
							: open
								? {
									borderColor: colors.primary[500],
									boxShadow: `0 0 0 4px ${colors.primary[100]}`,
								}
								: {
									borderColor: colors.primary[300],
									backgroundColor: '#ffffff',
								}
				}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-invalid={errorState || undefined}
			>
				<span
					className="truncate text-left"
					style={{
						color:
							selectedOption || (typeof value === 'string' && value?.trim())
								? colors.primary[900]
								: colors.primary[400],
					}}
				>
					{buttonLabel}
				</span>

				<span className="ml-3 flex items-center gap-2">
					{clearable && (selectedOption || (typeof value === 'string' && value)) && !disabled && (
						<motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
							<X className="h-4 w-4 transition-colors" style={{ color: colors.primary[400] }} onClick={clear} />
						</motion.div>
					)}
					<motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
						<ChevronDown className="h-4 w-4 transition-colors" style={{ color: colors.primary[600] }} />
					</motion.div>
				</span>
			</button>

			{errorState && (
				<div
					className="mt-2 flex items-start gap-2 p-3 rounded-lg border-l-4 transition-all duration-300"
					style={{ backgroundColor: '#fff1f2', borderColor: '#f43f5e' }}
				>
					<AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
					<p className="text-base font-medium text-rose-700">{error}</p>
				</div>
			)}

			{portalReady &&
				open &&
				createPortal(
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						role="listbox"
						aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined}
						className="z-[99999999] fixed mt-0"
						style={{ top: coords.top, left: coords.left, width: coords.width }}
					>
						<div
							ref={listRef}
							className="max-h-80 overflow-auto rounded-lg border-2 bg-white shadow-2xl ring-1 ring-black/5"
							style={{ borderColor: colors.primary[200] }}
							onKeyDown={onKeyDown}
						>
							{searchable && !createMode && (
								<div className="p-3 border-b sticky top-0 bg-white z-10" style={{ borderColor: colors.primary[100] }}>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.primary[400] }} />
										<input
											className="w-full h-10 pl-10 pr-3 py-2 rounded-lg border-2 text-base outline-none bg-white font-medium transition-all"
											style={{ borderColor: colors.primary[200], color: colors.primary[900] }}
											placeholder={t('select.search_placeholder')}
											value={query}
											onChange={(e) => {
												setQuery(e.target.value);
												setActiveIndex(0);
											}}
											autoFocus
										/>
									</div>
								</div>
							)}

							{allowCustom && createMode && (
								<div className="p-3 border-b sticky top-0 bg-white z-10" style={{ borderColor: colors.primary[100] }}>
									<div className="flex gap-2">
										<input
											ref={createInputRef}
											className="flex-1 h-10 px-3 rounded-lg border-2 text-base outline-none font-medium"
											style={{ borderColor: colors.primary[200], color: colors.primary[900] }}
											placeholder={createHintText}
											value={createText}
											onChange={(e) => setCreateText(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													createFromText(createText);
												}
												if (e.key === 'Escape') {
													e.preventDefault();
													setCreateMode(false);
													setCreateText('');
												}
											}}
										/>
										<button
											type="button"
											onClick={() => createFromText(createText)}
											className="inline-flex items-center gap-1 rounded-lg px-3 text-base border h-9"
											style={{ borderColor: colors.primary[300] }}
										>
											<Save className="w-4 h-4" /> {t('select.save')}
										</button>
										<button
											type="button"
											onClick={() => {
												setCreateMode(false);
												setCreateText('');
											}}
											className="inline-flex items-center gap-1 rounded-lg px-3 text-base border h-9"
											style={{ borderColor: colors.primary[300] }}
										>
											<CircleX className="w-4 h-4" /> {t('select.cancel')}
										</button>
									</div>
								</div>
							)}

							{!createMode && (
								<>
									<ul className="py-1">
										{filtered.length === 0 && (
											<li className="px-3 py-2 text-base" style={{ color: colors.primary[400] }}>
												{t('select.no_results')}
											</li>
										)}
										{filtered.map((item, idx) => {
											const isSelected = selectedOption?.id === item.id;
											const isActive = idx === activeIndex;
											return (
												<li
													id={`opt-${idx}`}
													key={item.id}
													role="option"
													aria-selected={isSelected}
													className="mx-1 my-0.5 rounded-lg px-3 py-2 text-base flex items-center justify-between select-none cursor-pointer transition-colors"
													style={{
														backgroundColor: isActive ? colors.primary[50] : 'transparent',
														color: isSelected ? colors.primary[700] : colors.primary[900],
													}}
													onMouseEnter={() => setActiveIndex(idx)}
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => pick(item)}
												>
													<span className="truncate">{item.label}</span>
													{isSelected && <Check className="h-4 w-4" style={{ color: colors.primary[600] }} />}
												</li>
											);
										})}
									</ul>

									{allowCustom && query.trim() && !hasExactMatch && (
										<div className="p-2 border-t sticky bottom-0 bg-white" style={{ borderColor: colors.primary[100] }}>
											<button
												type="button"
												onClick={() => createFromText(query)}
												className="w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-base border border-dashed"
												style={{ borderColor: colors.primary[300] }}
											>
												<Plus className="w-4 h-4" />
												{t('select.create_from_query', { value: query.trim() })}
											</button>
										</div>
									)}
								</>
							)}

							{!createMode && allowCustom && (
								<div className="p-2 border-t sticky bottom-0 bg-white" style={{ borderColor: colors.primary[100] }}>
									<button
										type="button"
										onClick={() => {
											setCreateMode(true);
											setCreateText('');
										}}
										className="w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-base border"
										style={{ borderColor: colors.primary[300] }}
									>
										<Plus className="w-4 h-4" />
										{createHintText}
									</button>
								</div>
							)}
						</div>
					</motion.div>,
					document.body,
				)}
		</div>
	);
}

/* Helper for error rendering */
const renderErrorText = (err) => {
	if (!err) return null;
	return (
		<motion.p
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600"
		>
			<FiAlertCircle className="inline-block flex-shrink-0" size={14} />
			<span>{err.message}</span>
		</motion.p>
	);
};

/* ---------- MAIN FORM SUBMISSION PAGE ---------- */
export default function FormSubmissionPage() {
	const params = useParams();
	const router = useRouter();
	const t = useTranslations('publicForm');
	const { colors } = useTheme();

	const [form, setForm] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fileNames, setFileNames] = useState({});
	const [clientIp, setClientIp] = useState('');

	const searchParams = useSearchParams();
	const reportTo = searchParams.get('report_to'); 

	// Fetch form (public)
	useEffect(() => {
		fetchForm();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.id]);

	const fetchForm = async () => {
		try {
			const res = await api.get(`/forms/${params.id}/public`);
			const f = res?.data || null;
			const sorted = (f?.fields || []).slice().sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
			setForm({ ...f, fields: sorted });
		} catch (e) {
			console.error(e);
			toast.error(t('messages.load_failed'));
			setForm(null);
		} finally {
			setIsLoading(false);
		}
	};

	// ✅ ALWAYS remove email/phone from dynamic fields (even if backend sends them)
	const dynamicFields = useMemo(() => {
		return (form?.fields || []).filter((f) => f?.key !== 'email' && f?.key !== 'phone');
	}, [form?.fields]);

	// optional debug: duplicated keys
	useEffect(() => {
		if (!form?.fields) return;
		const keys = form.fields.map((f) => f.key);
		const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
		if (dups.length) console.log('DUPLICATE FIELD KEYS:', dups);
	}, [form]);

	useEffect(() => {
		fetch('https://api.ipify.org?format=json')
			.then((r) => r.json())
			.then((data) => setClientIp(data?.ip || ''))
			.catch(() => setClientIp(''));
	}, []);

	// Build dynamic validation based on form response
	const dynamicShape = useMemo(() => {
		const phoneRule = yup
			.string()
			.required(t('validation.phone_required'))
			.test('valid-phone', t('validation.phone_invalid'), (value) => {
				if (!value) return false;
				const digits = String(value).replace(/\D/g, '');
				return digits.length >= 7 && digits.length <= 15;
			});

		const shape = {
			email: yup.string().email(t('validation.email_invalid')).required(t('validation.email_required')),
			phone: phoneRule,
		};

		for (const field of dynamicFields) {
			if (!field?.required) continue;

			const label = field.label || field.key;

			switch (field.type) {
				case 'file':
					shape[field.key] = yup.array().of(yup.mixed()).nullable();
					break;

				case 'checklist':
					shape[field.key] = yup.array().of(yup.string()).min(1, t('validation.required_generic', { label }));
					break;

				case 'checkbox':
					shape[field.key] = yup.boolean().oneOf([true], t('validation.required_generic', { label }));
					break;

				case 'phone':
					shape[field.key] = phoneRule;
					break;

				case 'date':
					shape[field.key] = yup
						.date()
						.typeError(t('validation.date_invalid', { label }))
						.required(t('validation.required_generic', { label }));
					break;

				case 'number':
					shape[field.key] = yup
						.number()
						.transform((v) => (isNaN(v) ? undefined : v))
						.typeError(t('validation.number_type', { label }))
						.required(t('validation.required_generic', { label }));
					break;

				default:
					shape[field.key] = yup.string().trim().required(t('validation.required_generic', { label }));
			}
		}

		return yup.object().shape(shape);
	}, [dynamicFields, t]);

	const resolver = useMemo(() => yupResolver(dynamicShape), [dynamicShape]);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		getValues,
		setError,
		clearErrors,
		reset,
		formState: { errors },
	} = useForm({
		resolver,
	});

	const buildDraftKey = (formId) => `publicFormDraft:${formId}`;

	function safeJsonParse(v) {
		try {
			return v ? JSON.parse(v) : null;
		} catch {
			return null;
		}
	}

	// Restore draft
	useEffect(() => {
		if (!form?.id) return;

		const key = buildDraftKey(form.id);
		const saved = safeJsonParse(localStorage.getItem(key));
		if (!saved) return;

		const { __fileNames, ...values } = saved;

		// ✅ don't wipe user typing with validation changes, just load once
		reset(values, { keepErrors: true, keepDirty: true, keepTouched: true });

		if (__fileNames && typeof __fileNames === 'object') {
			setFileNames(__fileNames);
		}
	}, [form?.id, reset]);

	// Save draft (IMPORTANT: include dynamicFields in deps)
	useEffect(() => {
		if (!form?.id) return;

		const key = buildDraftKey(form.id);
		const sub = watch((values) => {
			const clean = { ...values };

			// never store file objects
			dynamicFields.forEach((f) => {
				if (f.type === 'file') clean[f.key] = [];
			});

			clean.__fileNames = fileNames;
			localStorage.setItem(key, JSON.stringify(clean));
		});

		return () => sub.unsubscribe();
	}, [form?.id, watch, fileNames, dynamicFields]);

	const toYMD = (d) => {
		if (!d) return '';
		const dt = d instanceof Date ? d : new Date(d);
		const y = dt.getFullYear();
		const m = String(dt.getMonth() + 1).padStart(2, '0');
		const day = String(dt.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	};

	const watchAll = watch();

	const progress = useMemo(() => {
		if (!form) return 0;
		const requiredKeys = ['email', 'phone', ...dynamicFields.filter((f) => f.required).map((f) => f.key)];
		const vals = getValues();
		let filled = 0;

		requiredKeys.forEach((k) => {
			const v = vals?.[k];
			if (Array.isArray(v)) {
				if (v.length) filled++;
			} else if (typeof v === 'boolean') {
				if (v) filled++;
			} else if (v instanceof Date) {
				if (v) filled++;
			} else if (v !== undefined && v !== null && String(v).trim() !== '') {
				filled++;
			}
		});

		return Math.round((filled / requiredKeys.length) * 100);
	}, [form, dynamicFields, getValues, watchAll]);

	const onSubmit = async (data) => {
		try {
			setIsSubmitting(true);

			const normalizedAnswers = { ...data };

			// normalize date fields
			(form?.fields || []).forEach((f) => {
				if (f.type === 'date' && normalizedAnswers[f.key]) {
					normalizedAnswers[f.key] = toYMD(normalizedAnswers[f.key]);
				}
			});

			normalizedAnswers.clientIp = clientIp || undefined;

			const fd = new FormData();
			fd.append('email', data.email);
			fd.append('phone', data.phone);

			const answersOnly = { ...normalizedAnswers };
			delete answersOnly.email;
			delete answersOnly.phone;

			(form?.fields || []).forEach((f) => {
				if (f.type === 'file') {
					const v = answersOnly[f.key];
					if (Array.isArray(v) && v.length) {
						v.forEach((file) => {
							if (file instanceof File) fd.append(f.key, file);
						});
						answersOnly[f.key] = [];
					} else {
						answersOnly[f.key] = [];
					}
				}
			});

			fd.append('answers', JSON.stringify(answersOnly));

			await api.post(`/forms/${params.id}/submit?report_to=${encodeURIComponent(reportTo)}`, fd);

			if (form?.id) localStorage.removeItem(buildDraftKey(form.id));

			toast.success(t('messages.submit_success'));
			// router.push('/thank-you');
		} catch (e) {
			console.error(e);
			const msg = e?.response?.data?.message || t('messages.submit_failed');

			const fieldErrors = e?.response?.data?.errors;
			if (fieldErrors && typeof fieldErrors === 'object') {
				const flat = Object.values(fieldErrors).flat();
				toast.error(flat.join('\n'));
			} else {
				toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	// Radio as cards
	const RadioGroup = ({ field, error }) => {
		const current = watch(field.key);
		return (
			<div className="space-y-3">
				<label className="block text-base font-semibold" style={{ color: colors.primary[800] }}>
					<MultiLangText>{field.label}</MultiLangText>
					{field.required && <span className="text-rose-500 ml-1">*</span>}
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{(field.options || []).map((opt) => {
						const active = current === opt;
						return (
							<motion.label
								key={opt}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="group relative flex items-center justify-between gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200"
								style={{
									borderColor: active ? colors.primary[500] : colors.primary[200],
									background: active ? `linear-gradient(135deg, ${colors.primary[50]}, white)` : 'white',
									boxShadow: active ? `0 4px 12px ${colors.primary[100]}` : 'none',
								}}
							>
								<div className="flex items-center gap-3">
									<div
										className="relative flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all"
										style={{
											borderColor: active ? colors.primary[500] : colors.primary[300],
											backgroundColor: active ? colors.primary[500] : 'white',
										}}
									>
										{active && (
											<motion.div
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white"
											/>
										)}
									</div>
									<input type="radio" value={opt} {...register(field.key)} className="sr-only" />
									<MultiLangText className="text-base font-medium" style={{ color: colors.primary[800] }}>
										{opt}
									</MultiLangText>
								</div>
								{active && (
									<motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
										<FiCheck style={{ color: colors.primary[600] }} size={18} />
									</motion.div>
								)}
							</motion.label>
						);
					})}
				</div>
				{renderErrorText(error)}
			</div>
		);
	};

	// Checklist as pills
	const ChecklistGroup = ({ field, error }) => {
		const selected = watch(field.key) || [];
		const toggle = useCallback(
			(val) => {
				const set = new Set(selected);
				if (set.has(val)) set.delete(val);
				else set.add(val);
				setValue(field.key, Array.from(set), { shouldValidate: true, shouldDirty: true });
			},
			[selected, setValue, field.key],
		);

		return (
			<div className="space-y-3">
				<label className="block text-base font-semibold" style={{ color: colors.primary[800] }}>
					<MultiLangText>{field.label}</MultiLangText>
					{field.required && <span className="text-rose-500 ml-1">*</span>}
				</label>
				<div className="flex flex-wrap gap-2">
					{(field.options || []).map((opt) => {
						const active = selected.includes(opt);
						return (
							<motion.button
								type="button"
								key={opt}
								onClick={() => toggle(opt)}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="px-4 py-2 rounded-full text-base font-medium border-2 transition-all duration-200"
								style={{
									background: active ? `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})` : 'white',
									color: active ? 'white' : colors.primary[700],
									borderColor: active ? colors.primary[600] : colors.primary[200],
									boxShadow: active ? `0 4px 12px ${colors.primary[200]}` : 'none',
								}}
							>
								{opt}
							</motion.button>
						);
					})}
				</div>
				{renderErrorText(error)}
			</div>
		);
	};

	const renderFieldInput = (field) => {
		const fieldValue = watch(field.key);
		const error = errors?.[field.key];

		switch (field.type) {
			case 'text':
			case 'number':
			case 'email':
				return (
					<Input
						label={<MultiLangText>{field.label}</MultiLangText>}
						placeholder={field.placeholder || ''}
						type={field.type === 'number' ? 'number' : field.type}
						error={error?.message}
						required={field.required}
						registration={register(field.key)}
					/>
				);

			case 'date':
				return (
					<div className="w-full">
						<label className="mb-2 block text-base font-semibold" style={{ color: colors.primary[700] }}>
							<MultiLangText>{field.label}</MultiLangText>
							{field.required && <span className="text-rose-500 ml-1">*</span>}
						</label>
						<div className="relative group">
							<Flatpickr
								value={fieldValue}
								onChange={([date]) => setValue(field.key, date, { shouldValidate: true })}
								options={{ dateFormat: 'Y-m-d', allowInput: true }}
								className="w-full h-12 pl-4 pr-12 border-2 rounded-lg shadow-sm transition-all duration-200 text-base font-medium outline-none bg-white"
								placeholder={field.placeholder || t('fields.date.placeholder')}
								style={{
									borderColor: error ? '#f43f5e' : colors.primary[300],
									color: colors.primary[900],
								}}
							/>
							<div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
								<FiCalendar className="transition-colors" style={{ color: error ? '#f43f5e' : colors.primary[400] }} size={18} />
							</div>
						</div>
						{renderErrorText(error)}
					</div>
				);

			case 'textarea':
				return (
					<Textarea
						label={<MultiLangText>{field.label}</MultiLangText>}
						placeholder={field.placeholder || ''}
						rows={2}
						error={error?.message}
						required={field.required}
						registration={register(field.key)}
					/>
				);

			case 'select':
				return (
					<Select
						label={<MultiLangText>{field.label}</MultiLangText>}
						placeholder={field.placeholder || t('fields.select.placeholder')}
						options={(field.options || []).map((opt) => ({ id: opt, label: opt }))}
						value={fieldValue}
						onChange={(val) => setValue(field.key, val, { shouldValidate: true })}
						required={!!field.required}
						error={error?.message}
					/>
				);

			case 'radio':
				return <RadioGroup field={field} error={error} />;

			case 'checkbox':
				return (
					<div className="py-1">
						<CheckBox
							label={<MultiLangText>{field.label}</MultiLangText>}
							initialChecked={!!fieldValue}
							onChange={(checked) => setValue(field.key, checked, { shouldValidate: true })}
						/>
						{renderErrorText(error)}
					</div>
				);

			case 'checklist':
				return <ChecklistGroup field={field} error={error} />;

			case 'file': {
				const files = watch(field.key) || [];
				return (
					<PrettyFileInput
						label={<MultiLangText>{field.label}</MultiLangText>}
						required={field.required}
						error={error?.message}
						valueNames={(files || []).map((f) => (f instanceof File ? f.name : String(f)))}
						accept="*/*"
						onPickMany={(picked) => {
							setValue(field.key, picked, { shouldValidate: true, shouldDirty: true });
						}}
						onClear={() => {
							setValue(field.key, [], { shouldValidate: true, shouldDirty: true });
						}}
					/>
				);
			}

			case 'phone':
				return (
					<PhoneField
						name={field.key}
						label={<MultiLangText>{field.label}</MultiLangText>}
						value={fieldValue || ''}
						required={field.required}
						error={error?.message}
						setError={setError}
						clearErrors={clearErrors}
						onChange={(val) => setValue(field.key, val, { shouldValidate: true })}
					/>
				);

			default:
				return (
					<Input
						label={<MultiLangText>{field.label}</MultiLangText>}
						placeholder={field.placeholder || ''}
						error={error?.message}
						required={field.required}
						registration={register(field.key)}
					/>
				);
		}
	};

	// --- Loading Skeleton ---
	const Skeleton = () => (
		<div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${colors.primary[50]}, white, ${colors.primary[50]})` }}>
			<div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b shadow-sm" style={{ borderColor: colors.primary[200] }}>
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
					<div className="flex items-center justify-between gap-4 animate-pulse">
						<div className="h-8 w-64 rounded-lg" style={{ backgroundColor: colors.primary[200] }} />
						<div className="min-w-[180px] w-48">
							<div className="flex items-center justify-between mb-2">
								<div className="h-3 w-16 rounded" style={{ backgroundColor: colors.primary[200] }} />
								<div className="h-3 w-12 rounded" style={{ backgroundColor: colors.primary[200] }} />
							</div>
							<div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.primary[200] }}>
								<div className="h-full w-1/3" style={{ backgroundColor: colors.primary[300] }} />
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="bg-white shadow-xl rounded-lg overflow-hidden border" style={{ borderColor: colors.primary[200] }}>
					<div className="px-6 sm:px-8 py-6 border-b" style={{ background: `linear-gradient(to right, ${colors.primary[50]}, white)`, borderColor: colors.primary[200] }}>
						<div className="flex items-center gap-3 animate-pulse">
							<div className="h-8 w-32 rounded-full" style={{ backgroundColor: colors.primary[200] }} />
							<div className="h-4 w-48 sm:w-72 rounded" style={{ backgroundColor: colors.primary[200] }} />
						</div>
					</div>

					<div className="p-6 sm:p-8 space-y-10 animate-pulse">
						<section className="space-y-5">
							<div className="h-5 w-32 rounded" style={{ backgroundColor: colors.primary[200] }} />
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div className="space-y-2">
									<div className="h-4 w-20 rounded" style={{ backgroundColor: colors.primary[200] }} />
									<div className="h-12 w-full rounded-lg" style={{ backgroundColor: colors.primary[200] }} />
								</div>
								<div className="space-y-2">
									<div className="h-4 w-20 rounded" style={{ backgroundColor: colors.primary[200] }} />
									<div className="h-12 w-full rounded-lg" style={{ backgroundColor: colors.primary[200] }} />
								</div>
							</div>
						</section>
					</div>
				</div>
			</div>

			<div className="fixed bottom-6 left-0 right-0 px-4 sm:px-6 lg:px-8 pointer-events-none">
				<div className="max-w-5xl mx-auto">
					<div className="rounded-lg bg-white shadow-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse pointer-events-auto" style={{ borderColor: colors.primary[200] }}>
						<div className="h-4 w-56 rounded" style={{ backgroundColor: colors.primary[200] }} />
						<div className="h-12 w-full sm:w-44 rounded-lg" style={{ backgroundColor: colors.primary[200] }} />
					</div>
				</div>
			</div>
		</div>
	);

	if (isLoading) return <Skeleton />;

	if (!form) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${colors.primary[50]}, white, ${colors.primary[50]})` }}>
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
					<div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: colors.primary[100] }}>
						<FiXCircle className="w-10 h-10" style={{ color: colors.primary[400] }} />
					</div>
					<h3 className="text-2xl font-bold mb-3" style={{ color: colors.primary[900] }}>
						{t('errors.not_found_title')}
					</h3>
					<p className="max-w-md" style={{ color: colors.primary[600] }}>
						{t('errors.not_found_subtitle')}
					</p>
				</motion.div>
			</div>
		);
	}

	const isFullWidthField = (type) => [].includes(type);

	return (
		<div className="min-h-screen pb-28" style={{ background: `linear-gradient(135deg, ${colors.primary[50]}, white, ${colors.primary[50]})` }}>
			<motion.div
				initial={{ y: -100 }}
				animate={{ y: 0 }}
				className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b shadow-sm"
				style={{ borderColor: colors.primary[200] }}
			>
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
					<div className="flex items-center justify-between gap-6">
						<div className="flex-1 min-w-0">
							<MultiLangText className="text-base sm:text-3xl font-bold truncate" style={{ color: colors.primary[900] }}>
								{form.title}
							</MultiLangText>
						</div>
						<div className="min-w-[130px] max-w-[180px]">
							<div className="flex items-center justify-between text-xs font-semibold mb-2" style={{ color: colors.primary[600] }}>
								<span>{t('header.progress_label')}</span>
								<span style={{ color: colors.primary[600] }}>{isNaN(progress) ? 0 : progress}%</span>
							</div>
							<div className="h-2.5 rounded-full overflow-hidden shadow-inner" style={{ backgroundColor: colors.primary[200] }}>
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${isNaN(progress) ? 0 : progress}%` }}
									transition={{ type: 'spring', stiffness: 100, damping: 20 }}
									className="h-full rounded-full shadow-sm"
									style={{
										background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
										boxShadow: `0 0 10px ${colors.primary[400]}`,
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			</motion.div>

			<form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white shadow-xl rounded-lg overflow-visible border" style={{ borderColor: colors.primary[200] }}>
					<div className="p-6 sm:p-8 space-y-12">
						<motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} aria-labelledby="contact-info" className="space-y-5">
							<div className="flex items-center gap-3">
								<div
									className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
									style={{
										background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
										boxShadow: `0 4px 12px ${colors.primary[200]}`,
									}}
								>
									<FiUser className="text-white" size={20} />
								</div>
								<h2 id="contact-info" className="text-lg font-bold" style={{ color: colors.primary[900] }}>
									{t('sections.contact')}
								</h2>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<Input
									label={t('fields.email.label')}
									type="email"
									placeholder={t('fields.email.placeholder')}
									error={errors?.email?.message}
									icon={<FiMail size={18} />}
									required
									registration={register('email')}
								/>

								<PhoneField
									name="phone"
									label={t('fields.phone.label')}
									required
									value={watch('phone') || ''}
									error={errors?.phone?.message}
									setError={setError}
									clearErrors={clearErrors}
									onChange={(val) => setValue('phone', val, { shouldValidate: true })}
								/>
							</div>
						</motion.section>

						{dynamicFields.length > 0 && (
							<motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} aria-labelledby="additional-info" className="space-y-5">
								<div className="flex items-center gap-3">
									<div
										className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
										style={{
											background: `linear-gradient(135deg, ${colors.secondary[500]}, ${colors.secondary[600]})`,
											boxShadow: `0 4px 12px ${colors.secondary[200]}`,
										}}
									>
										<FiAlertCircle className="text-white" size={20} />
									</div>
									<h2 id="additional-info" className="text-lg font-bold" style={{ color: colors.primary[900] }}>
										{t('sections.additional')}
									</h2>
								</div>

								<motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-5">
									{dynamicFields.map((field, index) => (
										<motion.div
											key={field.id ?? field.key}
											layout
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.3, delay: index * 0.05 }}
											className={isFullWidthField(field.type) ? 'md:col-span-2' : ''}
										>
											{renderFieldInput(field)}
										</motion.div>
									))}
								</motion.div>
							</motion.section>
						)}
					</div>
				</motion.div>

				<AnimatePresence>
					<motion.div
						initial={{ y: 100, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
						className="fixed bottom-6 left-0 right-0 px-4 sm:px-6 lg:px-8 pointer-events-none z-30"
					>
						<div className="max-w-5xl mx-auto">
							<div className=" max-md:flex-row max-md:justify-center rounded-lg bg-white/95 backdrop-blur-xl shadow-2xl border-2 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pointer-events-auto" style={{ borderColor: colors.primary[200] }}>
								<div className="flex items-center gap-3">
									<div className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.primary[100]}, ${colors.primary[50]})` }}>
										<FiAlertCircle style={{ color: colors.primary[600] }} size={20} />
									</div>
									<p className=" w-full max-md:text-sm max-md:text-center text-base font-medium" style={{ color: colors.primary[700] }}>
										{t('footer.review_before_submit')}
									</p>
								</div>

								<motion.button
									type="submit"
									disabled={isSubmitting}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className=" max-md:w-fit max-md:px-4 w-full sm:w-auto px-8 py-3 max-md:py-4 rounded-lg font-semibold text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
									style={{
										background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
										boxShadow: `0 4px 12px ${colors.primary[200]}`,
										opacity: isSubmitting ? 0.7 : 1,
										cursor: isSubmitting ? 'not-allowed' : 'pointer',
									}}
								>
									{isSubmitting ? (
										<>
											<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
											<span className='max-md:hidden' >{t('cta.submitting')}</span>
										</>
									) : (
										<>
											<FiSend size={18} />
											<span className='max-md:hidden' >{t('cta.submit')}</span>
										</>
									)}
								</motion.button>
							</div>
						</div>
					</motion.div>
				</AnimatePresence>
			</form>
		</div>
	);
}

function PrettyFileInput({
	label,
	required,
	error,
	valueNames = [],
	onPickMany,
	onClear,
	accept,
	disabled = false,
	multiple = true,
}) {
	const { colors } = useTheme();
	const t = useTranslations('publicForm'); // ✅ localization
	const inputRef = useRef(null);
	const hasError = !!error;

	return (
		<div className="w-full">
			<label className="mb-2 block text-base font-semibold" style={{ color: colors.primary[700] }}>
				{label} {required && <span className="text-rose-500">*</span>}
			</label>

			<div
				className="rounded-lg border-2 p-4 transition-all duration-300 bg-white"
				style={
					disabled
						? { borderColor: colors.primary[200], backgroundColor: colors.primary[50], opacity: 0.7 }
						: hasError
							? { borderColor: '#f43f5e', backgroundColor: '#fff1f2', boxShadow: '0 0 0 4px rgba(244,63,94,.08)' }
							: { borderColor: colors.primary[300] }
				}
			>
				<input
					ref={inputRef}
					type="file"
					className="hidden"
					accept={accept}
					disabled={disabled}
					multiple={multiple}
					onChange={(e) => {
						const files = Array.from(e.target.files || []);
						onPickMany(files);
					}}
				/>

				<div className="flex max-md:flex-col items-center justify-between gap-3">
					<div className="min-w-0 flex-1">
						{valueNames?.length ? (
							<div className="space-y-1">
								{valueNames.map((n, i) => (
									<p key={i} className="text-base font-medium truncate" style={{ color: colors.primary[900] }}>
										{n}
									</p>
								))}
							</div>
						) : (
							<div>
								<p className="text-base font-medium truncate" style={{ color: colors.primary[900] }}>
									{t('fileInput.no_files_selected')}
								</p>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 flex-shrink-0">
						{!!valueNames?.length && !disabled && (
							<button
								type="button"
								onClick={() => {
									if (inputRef.current) inputRef.current.value = '';
									onClear();
								}}
								className="px-3 h-10 rounded-lg border text-base font-semibold transition-all"
								style={{ borderColor: colors.primary[200], color: colors.primary[700] }}
							>
								{t('fileInput.remove_all')}
							</button>
						)}

						<button
							type="button"
							disabled={disabled}
							onClick={() => inputRef.current?.click()}
							className="px-4 h-10 rounded-lg text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98]"
							style={{
								background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
								opacity: disabled ? 0.6 : 1,
								cursor: disabled ? 'not-allowed' : 'pointer',
							}}
						>
							{t('fileInput.choose_files')}
						</button>
					</div>
				</div>
			</div>

			{hasError && (
				<div
					className="mt-2 flex items-start gap-2 p-3 rounded-lg border-l-4"
					style={{ backgroundColor: '#fff1f2', borderColor: '#f43f5e' }}
				>
					<AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
					<p className="text-base font-medium text-rose-700">{error}</p>
				</div>
			)}
		</div>
	);
}

