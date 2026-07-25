'use client';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

const EMPTY = '__demo_empty__';

export default function DemoSelect({
	value,
	onValueChange,
	placeholder,
	disabled,
	options = [],
	className,
	triggerClassName,
	ariaLabel,
	allowEmpty = false,
	emptyLabel,
}) {
	const resolvedValue =
		value === '' || value == null
			? allowEmpty
				? EMPTY
				: undefined
			: String(value);

	const handleChange = next => {
		if (allowEmpty && next === EMPTY) {
			onValueChange?.('');
			return;
		}
		onValueChange?.(next);
	};

	return (
		<Select value={resolvedValue} onValueChange={handleChange} disabled={disabled}>
			<SelectTrigger
				aria-label={ariaLabel || placeholder}
				className={cn('h-9 min-w-0 text-xs sm:text-sm', triggerClassName, className)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{allowEmpty && (
					<SelectItem value={EMPTY}>{emptyLabel || placeholder}</SelectItem>
				)}
				{options.map(option => (
					<SelectItem
						key={String(option.value)}
						value={String(option.value)}
						disabled={option.disabled}
					>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
