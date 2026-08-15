'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

/**
 * Sleek custom dropdown (Radix) — replaces native <select>.
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  className,
  triggerClassName,
  disabled,
}) {
  const safeOptions = options.filter((opt) => opt.value !== '' && opt.value != null);
  const safeValue = value == null || value === '' ? undefined : String(value);
  const selectedLabel = safeOptions.find((opt) => String(opt.value) === safeValue)?.label;

  return (
    <Select
      value={safeValue}
      onValueChange={(v) => onChange?.(v)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-10 w-full rounded-xl border-[color-mix(in_srgb,var(--color-primary-200)_55%,transparent)] bg-white text-[13px] shadow-sm',
          'hover:border-[color-mix(in_srgb,var(--color-primary-300)_70%,transparent)] focus-visible:ring-[color-mix(in_srgb,var(--color-primary-400)_30%,transparent)]',
          triggerClassName,
          className,
        )}
      >
        <span className={`min-w-0 flex-1 truncate text-start ${selectedLabel ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selectedLabel || placeholder}
        </span>
      </SelectTrigger>
      <SelectContent className="z-[80] rounded-xl border-[color-mix(in_srgb,var(--color-primary-200)_50%,transparent)] shadow-xl">
        {safeOptions.map((opt) => (
          <SelectItem
            key={String(opt.value)}
            value={String(opt.value)}
            className="rounded-lg text-[13px]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
