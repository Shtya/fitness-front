'use client';

import { useMemo } from 'react';
import Select from '@/components/atoms/Select';
import { Phone as PhoneIcon } from 'lucide-react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Extended metadata per country code
const COUNTRY_META = {
  '+20': {
    iso2: 'EG',
    example: '10 1234 5678',
    min: 10, // digits after +20
    max: 10,
    stripLeadingZero: true,
    allowedStarts: ['10', '11', '12', '15'], // Egyptian mobile ranges
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
    allowedStarts: [], // many ranges, keep flexible
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
    allowedStarts: [], // allow any 10-digit NANP
  },
  '+44': {
    iso2: 'GB',
    example: '7123 456789',
    min: 9,
    max: 10,
    stripLeadingZero: true,
    allowedStarts: ['7'], // mobile
  },
};

function validateByCountry(countryCode, number, required) {
  const meta = COUNTRY_META[countryCode] || {};
  const digitsOnly = (number || '').replace(/\D/g, ''); // only digits

  if (!digitsOnly) {
    if (required) {
      return { valid: false, message: 'errors.phoneRequired' };
    }
    return { valid: true, message: '' };
  }

  // 1) Detect "duplicated" country code inside number: e.g. "+20 2015..."
  const countryDigits = countryCode.replace('+', '');
  if (digitsOnly.startsWith(countryDigits)) {
    return { valid: false, message: 'errors.phoneDuplicateCountryCode' };
  }

  // 2) Detect local format with leading 0 when country code already selected:
  //    e.g. "+20" + "0155..." or "+966" + "05..."
  if (meta.stripLeadingZero && digitsOnly.startsWith('0')) {
    return { valid: false, message: 'errors.phoneLeadingZero' };
  }

  // 3) Start-with rules per country (mobile prefixes, etc.)
  if (meta.allowedStarts && meta.allowedStarts.length > 0) {
    const okPrefix = meta.allowedStarts.some(prefix => digitsOnly.startsWith(prefix));
    if (!okPrefix) {
      return { valid: false, message: 'errors.phoneStartInvalid' };
    }
  }

  // 4) Length check
  if (meta.min && digitsOnly.length < meta.min) {
    return { valid: false, message: 'errors.phoneTooShort' };
  }

  if (meta.max && digitsOnly.length > meta.max) {
    return { valid: false, message: 'errors.phoneTooLong' };
  }

  // 5) Extra validation using libphonenumber-js
  try {
    const phoneNumber = parsePhoneNumberFromString(countryCode + digitsOnly);
    if (!phoneNumber || !phoneNumber.isValid()) {
      return { valid: false, message: 'errors.phoneInvalid' };
    }
  } catch (e) {
    return { valid: false, message: 'errors.phoneInvalid' };
  }

  return { valid: true, message: '' };
}

export default function PhoneField({ label, value, onChange, error, required, name, setError, clearErrors, t, disabled = false, clearable = true, className = '' }) {
  const raw = value || '';

  // Parse current value: "+20 123456789" → countryCode: "+20", number: "123456789"
  const { countryCode, number } = useMemo(() => {
    if (!raw) return { countryCode: '+20', number: '' };

    if (raw.startsWith('+')) {
      const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
      return {
        countryCode: (match && match[1]) || '+20',
        number: (match && match[2])?.trim() || '',
      };
    }

    // No country code in string → default code, all in number
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
      // add more here if you want
    ],
    [],
  );

  const currentMeta = COUNTRY_META[countryCode] || {};
  const dynamicPlaceholder = currentMeta.example || '123456789';

  const applyValidation = (code, num) => {
    const { valid, message } = validateByCountry(code, num, required);

    if (!valid && setError && name) {
      setError(name, {
        type: 'manual',
        message, // i18n key, parent will translate
      });
    } else if (valid && clearErrors && name) {
      clearErrors(name);
    }
  };

  const handleCountryChange = v => {
    const code = typeof v === 'string' ? v : v?.target?.value;
    const next = number ? `${code} ${number}` : code || '';
    onChange && onChange(next);
    applyValidation(code, number);
  };

  const handleNumberChange = e => {
    const num = e.target.value;
    const next = num ? `${countryCode} ${num}` : countryCode;
    onChange && onChange(next);
    applyValidation(countryCode, num);
  };

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-medium text-slate-700'>
          {label} {required && <span className='text-red-500'>*</span>}
        </label>
      )}

      <div className='flex gap-2 rtl:flex-row-reverse'>
        {/* Country code dropdown */}
        <div className='min-w-[90px]'>
          <Select placeholder='+20' clearable={false} searchable={false} options={countries} value={countryCode} onChange={handleCountryChange} disabled={disabled} />
        </div>

        {/* Phone number input – styled like your Input2 but inline */}
        <div dir='ltr' className={['relative flex items-center rounded-lg border bg-white', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text', error && error !== 'users' ? 'border-rose-500' : 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500', 'focus-within:ring-4 focus-within:ring-indigo-100', 'transition-colors flex-1'].join(' ')}>
          <PhoneIcon className='absolute rtl:right-2 ltr:left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <input type='tel' placeholder={dynamicPlaceholder} value={number} onChange={handleNumberChange} disabled={disabled} className='input-3d h-[40px] w-full rounded-lg px-8 ltr:pr-[28px] rtl:pl-[28px] py-2 text-sm text-slate-900 outline-none placeholder:text-gray-400' aria-invalid={!!error} />
        </div>
      </div>

      {error && error !== 'users' && <p className='mt-1.5 text-xs text-rose-600'>{error}</p>}
    </div>
  );
}
