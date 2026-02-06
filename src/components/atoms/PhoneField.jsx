'use client';

import { useMemo } from 'react';
import Select from '@/components/atoms/Select';
import { Phone as PhoneIcon, AlertCircle } from 'lucide-react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Extended metadata per country code
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
    if (required) {
      return { valid: false, message: 'errors.phoneRequired' };
    }
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
    const okPrefix = meta.allowedStarts.some(prefix => digitsOnly.startsWith(prefix));
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
  } catch (e) {
    return { valid: false, message: 'errors.phoneInvalid' };
  }

  return { valid: true, message: '' };
}

export default function PhoneField({ 
  label, 
  value, 
  onChange, 
  error, 
  required, 
  name, 
  setError, 
  clearErrors, 
  t, 
  disabled = false, 
  clearable = true, 
  className = '' 
}) {
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
      setError(name, {
        type: 'manual',
        message,
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

  const hasError = error && error !== 'users';

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-medium text-slate-700'>
          {label} {required && <span className='text-rose-500'>*</span>}
        </label>
      )}

      <div className='flex gap-2 rtl:flex-row-reverse'>
        <div className='min-w-[90px]'>
          <Select 
            placeholder='+20' 
            clearable={false} 
            searchable={false} 
            options={countries} 
            value={countryCode} 
            onChange={handleCountryChange} 
            disabled={disabled} 
          />
        </div>

        {/* Phone number input with enhanced styling */}
        <div
          dir='ltr'
          className='relative flex items-center rounded-lg border bg-white transition-all duration-200 flex-1 group'
          style={
            hasError
              ? { borderColor: '#f43f5e', boxShadow: '0 0 0 3px rgba(244, 63, 94, 0.1)' }
              : disabled
              ? { borderColor: '#e2e8f0', opacity: 0.6, cursor: 'not-allowed' }
              : { borderColor: '#cbd5e1' }
          }>
          <PhoneIcon 
            className='absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors' 
            style={{ color: hasError ? '#f43f5e' : '#94a3b8' }}
          />
          
          <input
            type='tel'
            placeholder={dynamicPlaceholder}
            value={number}
            onChange={handleNumberChange}
            disabled={disabled}
            className='h-[40px] w-full rounded-lg px-10 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-transparent disabled:cursor-not-allowed'
            aria-invalid={!!hasError}
            style={{
              paddingLeft: 'calc(2.5rem)',
              paddingRight: '1rem',
            }}
          />

          {hasError && (
            <AlertCircle 
              className='absolute rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500' 
            />
          )}

          {/* Focus ring effect */}
          <div 
            className='absolute inset-0 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-focus-within:opacity-100'
            style={{
              boxShadow: hasError 
                ? '0 0 0 3px rgba(244, 63, 94, 0.1)'
                : '0 0 0 3px var(--color-primary-100)',
              borderColor: hasError ? '#f43f5e' : 'var(--color-primary-400)',
            }}
          />
        </div>
      </div>

      {hasError && (
        <div className='mt-1.5 flex items-center gap-1.5'>
          <AlertCircle className='w-3.5 h-3.5 text-rose-600 flex-shrink-0' />
          <p className='text-xs text-rose-600'>{error}</p>
        </div>
      )}
    </div>
  );
}