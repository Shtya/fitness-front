'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from '@/utils/axios';
import { FiXCircle, FiSend, FiCalendar, FiAlertCircle, FiCheck, FiMail, FiUser } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Search, Plus, Save, CircleX, AlertCircle, Phone as PhoneIcon, Upload, FileText as FileIcon } from 'lucide-react';
import { useTranslations } from 'use-intl';
import CheckBox from '@/components/atoms/CheckBox';
import MultiLangText from '@/components/atoms/MultiLangText';
import { useTheme } from '@/app/[locale]/theme';

/* ─────────────────────── Country meta ─────────────────────── */
const COUNTRY_META = {
  '+20': { iso2: 'EG', example: '10 1234 5678', min: 10, max: 10, stripLeadingZero: true, allowedStarts: ['10', '11', '12', '15'] },
  '+966': { iso2: 'SA', example: '5 1234 5678', min: 9, max: 9, stripLeadingZero: true, allowedStarts: ['5'] },
  '+961': { iso2: 'LB', example: '3 123 456', min: 7, max: 8, stripLeadingZero: true, allowedStarts: ['3', '70', '71', '76', '78', '79', '81'] },
  '+971': { iso2: 'AE', example: '50 123 4567', min: 9, max: 9, stripLeadingZero: true, allowedStarts: ['50', '52', '54', '55', '56'] },
  '+962': { iso2: 'JO', example: '7 9012 3456', min: 9, max: 9, stripLeadingZero: true, allowedStarts: ['7'] },
  '+964': { iso2: 'IQ', example: '7 8012 3456', min: 10, max: 10, stripLeadingZero: true, allowedStarts: ['7'] },
  '+965': { iso2: 'KW', example: '5000 0000', min: 8, max: 8, stripLeadingZero: false, allowedStarts: [] },
  '+974': { iso2: 'QA', example: '3 123 4567', min: 8, max: 8, stripLeadingZero: false, allowedStarts: ['3', '5', '6', '7'] },
  '+968': { iso2: 'OM', example: '9 123 4567', min: 8, max: 8, stripLeadingZero: false, allowedStarts: ['9'] },
  '+1': { iso2: 'US', example: '555 123 4567', min: 10, max: 10, stripLeadingZero: false, allowedStarts: [] },
  '+44': { iso2: 'GB', example: '7123 456789', min: 9, max: 10, stripLeadingZero: true, allowedStarts: ['7'] },
};

function validateByCountry(countryCode, number, required) {
  const meta = COUNTRY_META[countryCode] || {};
  const digitsOnly = (number || '').replace(/\D/g, '');
  if (!digitsOnly) {
    if (required) return { valid: false, message: 'errors.phoneRequired' };
    return { valid: true, message: '' };
  }
  const countryDigits = countryCode.replace('+', '');
  if (digitsOnly.startsWith(countryDigits)) return { valid: false, message: 'errors.phoneDuplicateCountryCode' };
  if (meta.stripLeadingZero && digitsOnly.startsWith('0')) return { valid: false, message: 'errors.phoneLeadingZero' };
  if (meta.allowedStarts?.length) {
    if (!meta.allowedStarts.some(p => digitsOnly.startsWith(p))) return { valid: false, message: 'errors.phoneStartInvalid' };
  }
  if (meta.min && digitsOnly.length < meta.min) return { valid: false, message: 'errors.phoneTooShort' };
  if (meta.max && digitsOnly.length > meta.max) return { valid: false, message: 'errors.phoneTooLong' };
  try {
    const p = parsePhoneNumberFromString(countryCode + digitsOnly);
    if (!p || !p.isValid()) return { valid: false, message: 'errors.phoneInvalid' };
  } catch {
    return { valid: false, message: 'errors.phoneInvalid' };
  }
  return { valid: true, message: '' };
}

function assignRef(ref, value) {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else ref.current = value;
}

/* ─────────────────────── Error block ─────────────────────── */
function ErrorBlock({ message }) {
  if (!message) return null;
  return (
    <div className='mt-2 flex items-start gap-2 px-3 py-2 rounded-lg border-l-[3px] bg-rose-50' style={{ borderColor: '#f43f5e' }}>
      <AlertCircle className='w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5' />
      <p className='text-sm font-medium text-rose-600'>{message}</p>
    </div>
  );
}

/* ─────────────────────── Input ─────────────────────── */
const Input = forwardRef(function Input({ label, placeholder = '', name, type = 'text', disabled = false, error, clearable = true, required = false, icon, className = '', registration, onChange, onBlur, defaultValue, ...rest }, ref) {
  const { colors } = useTheme();
  const inputRef = useRef(null);
  const [hasValue, setHasValue] = useState(!!defaultValue);
  useImperativeHandle(ref, () => inputRef.current);

  const reg = registration || {};
  const fieldName = reg.name || name;
  const hasError = !!error;

  const setRefs = el => {
    inputRef.current = el;
    assignRef(reg.ref, el);
    assignRef(ref, el);
  };

  const handleChange = e => {
    setHasValue(!!e.target.value);
    reg.onChange?.(e);
    onChange?.(e);
  };

  const handleBlur = e => {
    reg.onBlur?.(e);
    onBlur?.(e);
  };

  const clearInput = e => {
    e.stopPropagation();
    if (!inputRef.current) return;
    inputRef.current.value = '';
    setHasValue(false);
    const synthetic = { target: { name: fieldName, value: '' } };
    reg.onChange?.(synthetic);
    onChange?.(synthetic);
    inputRef.current.focus();
  };

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-semibold' style={{ color: colors.primary[700] }}>
          {label}
          {required && <span className='text-rose-500 ml-0.5'>*</span>}
        </label>
      )}
      <div
        className='relative flex items-center rounded-lg border-2 bg-white transition-colors duration-200'
        style={{
          borderColor: disabled ? colors.primary[200] : hasError ? '#f43f5e' : colors.primary[300],
          background: disabled ? colors.primary[50] : hasError ? '#fff8f8' : 'white',
          opacity: disabled ? 0.65 : 1,
        }}>
        {icon && (
          <div className='absolute ltr:left-3.5 rtl:right-3.5 pointer-events-none' style={{ color: hasError ? '#f43f5e' : colors.primary[400] }}>
            {icon}
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
          className={`h-12 w-full rounded-lg  py-3 text-sm font-medium outline-none placeholder:text-slate-400 bg-transparent ${icon && 'rtl:!pr-[40px] ltr:!pl-[40px]'}`}
          style={{
            paddingLeft: icon ? '2.75rem' : '1rem',
            paddingRight: clearable && hasValue ? '2.5rem' : '1rem',
            color: colors.primary[900],
          }}
          {...rest}
        />
        {clearable && hasValue && !disabled && (
          <button type='button' onClick={clearInput} className='absolute ltr:right-3 rtl:left-3 text-slate-400 hover:text-slate-600 transition-colors'>
            <X size={16} />
          </button>
        )}
      </div>
      <ErrorBlock message={error} />
    </div>
  );
});

/* ─────────────────────── Textarea ─────────────────────── */
const Textarea = forwardRef(function Textarea({ label, placeholder = '', name, rows = 3, error, required = false, disabled = false, className = '', registration, onChange, onBlur, defaultValue, ...props }, ref) {
  const { colors } = useTheme();
  const localRef = useRef(null);
  useImperativeHandle(ref, () => localRef.current);
  const reg = registration || {};
  const fieldName = reg.name || name;
  const hasError = !!error;

  const setRefs = el => {
    localRef.current = el;
    assignRef(reg.ref, el);
    assignRef(ref, el);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-semibold' style={{ color: colors.primary[700] }}>
          {label}
          {required && <span className='text-rose-500 ml-0.5'>*</span>}
        </label>
      )}
      <div
        className='rounded-lg border-2 bg-white transition-colors duration-200 overflow-hidden'
        style={{
          borderColor: disabled ? colors.primary[200] : hasError ? '#f43f5e' : colors.primary[300],
          background: disabled ? colors.primary[50] : hasError ? '#fff8f8' : 'white',
          opacity: disabled ? 0.65 : 1,
        }}>
        <textarea
          ref={setRefs}
          id={fieldName}
          name={fieldName}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          defaultValue={defaultValue}
          className='p-4 w-full bg-transparent outline-none text-sm font-medium placeholder:text-slate-400 resize-none'
          style={{ color: colors.primary[900] }}
          onChange={e => {
            reg.onChange?.(e);
            onChange?.(e);
          }}
          onBlur={e => {
            reg.onBlur?.(e);
            onBlur?.(e);
          }}
          {...props}
        />
      </div>
      <ErrorBlock message={error} />
    </div>
  );
});
Textarea.displayName = 'Textarea';

/* ─────────────────────── Phone Field (enhanced) ─────────────────────── */
function PhoneField({ label, value, onChange, error, required, name, setError, clearErrors, disabled = false, className = '' }) {
  const { colors } = useTheme();
  const raw = value || '';
  const [isCustomCode, setIsCustomCode] = useState(false);
  const [customCode, setCustomCode] = useState('');

  const { countryCode, number } = useMemo(() => {
    if (!raw) return { countryCode: '+20', number: '' };
    if (raw.startsWith('+')) {
      const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
      return { countryCode: (match && match[1]) || '+20', number: (match && match[2])?.trim() || '' };
    }
    return { countryCode: '+20', number: raw };
  }, [raw]);

  const countries = useMemo(
    () => [
      { id: '+93', flag: '🇦🇫', name: 'Afghanistan' },
      { id: '+355', flag: '🇦🇱', name: 'Albania' }, 
      { id: '+213', flag: '🇩🇿', name: 'Algeria' },
      { id: '+1-684', flag: '🇦🇸', name: 'American Samoa' },
      { id: '+376', flag: '🇦🇩', name: 'Andorra' },
      { id: '+244', flag: '🇦🇴', name: 'Angola' },
      { id: '+1-264', flag: '🇦🇮', name: 'Anguilla' },
      { id: '+1-268', flag: '🇦🇬', name: 'Antigua and Barbuda' },
      { id: '+54', flag: '🇦🇷', name: 'Argentina' },
      { id: '+374', flag: '🇦🇲', name: 'Armenia' },
      { id: '+297', flag: '🇦🇼', name: 'Aruba' },
      { id: '+61', flag: '🇦🇺', name: 'Australia' },
      { id: '+43', flag: '🇦🇹', name: 'Austria' },
      { id: '+994', flag: '🇦🇿', name: 'Azerbaijan' },
      { id: '+1-242', flag: '🇧🇸', name: 'Bahamas' },
      { id: '+973', flag: '🇧🇭', name: 'Bahrain' },
      { id: '+880', flag: '🇧🇩', name: 'Bangladesh' },
      { id: '+1-246', flag: '🇧🇧', name: 'Barbados' },
      { id: '+375', flag: '🇧🇾', name: 'Belarus' },
      { id: '+32', flag: '🇧🇪', name: 'Belgium' },
      { id: '+501', flag: '🇧🇿', name: 'Belize' },
      { id: '+229', flag: '🇧🇯', name: 'Benin' },
      { id: '+1-441', flag: '🇧🇲', name: 'Bermuda' },
      { id: '+975', flag: '🇧🇹', name: 'Bhutan' },
      { id: '+591', flag: '🇧🇴', name: 'Bolivia' },
      { id: '+387', flag: '🇧🇦', name: 'Bosnia and Herzegovina' },
      { id: '+267', flag: '🇧🇼', name: 'Botswana' },
      { id: '+55', flag: '🇧🇷', name: 'Brazil' },
      { id: '+246', flag: '🇮🇴', name: 'British Indian Ocean Territory' },
      { id: '+1-284', flag: '🇻🇬', name: 'British Virgin Islands' },
      { id: '+673', flag: '🇧🇳', name: 'Brunei' },
      { id: '+359', flag: '🇧🇬', name: 'Bulgaria' },
      { id: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
      { id: '+257', flag: '🇧🇮', name: 'Burundi' },
      { id: '+855', flag: '🇰🇭', name: 'Cambodia' },
      { id: '+237', flag: '🇨🇲', name: 'Cameroon' },
      { id: '+1', flag: '🇺🇸', name: 'USA' },
      { id: '+238', flag: '🇨🇻', name: 'Cape Verde' },
      { id: '+1-345', flag: '🇰🇾', name: 'Cayman Islands' },
      { id: '+236', flag: '🇨🇫', name: 'Central African Republic' },
      { id: '+235', flag: '🇹🇩', name: 'Chad' },
      { id: '+56', flag: '🇨🇱', name: 'Chile' },
      { id: '+86', flag: '🇨🇳', name: 'China' },
      { id: '+57', flag: '🇨🇴', name: 'Colombia' },
      { id: '+269', flag: '🇰🇲', name: 'Comoros' },
      { id: '+682', flag: '🇨🇰', name: 'Cook Islands' },
      { id: '+506', flag: '🇨🇷', name: 'Costa Rica' },
      { id: '+385', flag: '🇭🇷', name: 'Croatia' },
      { id: '+53', flag: '🇨🇺', name: 'Cuba' },
      { id: '+357', flag: '🇨🇾', name: 'Cyprus' },
      { id: '+420', flag: '🇨🇿', name: 'Czech Republic' },
      { id: '+243', flag: '🇨🇩', name: 'DR Congo' },
      { id: '+45', flag: '🇩🇰', name: 'Denmark' },
      { id: '+253', flag: '🇩🇯', name: 'Djibouti' },
      { id: '+1-767', flag: '🇩🇲', name: 'Dominica' },
      { id: '+1-809', flag: '🇩🇴', name: 'Dominican Republic' },
      { id: '+593', flag: '🇪🇨', name: 'Ecuador' },
      { id: '+20', flag: '🇪🇬', name: 'Egypt' },
      { id: '+503', flag: '🇸🇻', name: 'El Salvador' },
      { id: '+240', flag: '🇬🇶', name: 'Equatorial Guinea' },
      { id: '+291', flag: '🇪🇷', name: 'Eritrea' },
      { id: '+372', flag: '🇪🇪', name: 'Estonia' },
      { id: '+251', flag: '🇪🇹', name: 'Ethiopia' },
      { id: '+500', flag: '🇫🇰', name: 'Falkland Islands' },
      { id: '+298', flag: '🇫🇴', name: 'Faroe Islands' },
      { id: '+679', flag: '🇫🇯', name: 'Fiji' },
      { id: '+358', flag: '🇫🇮', name: 'Finland' },
      { id: '+33', flag: '🇫🇷', name: 'France' },
      { id: '+594', flag: '🇬🇫', name: 'French Guiana' },
      { id: '+689', flag: '🇵🇫', name: 'French Polynesia' },
      { id: '+241', flag: '🇬🇦', name: 'Gabon' },
      { id: '+220', flag: '🇬🇲', name: 'Gambia' },
      { id: '+995', flag: '🇬🇪', name: 'Georgia' },
      { id: '+49', flag: '🇩🇪', name: 'Germany' },
      { id: '+233', flag: '🇬🇭', name: 'Ghana' },
      { id: '+350', flag: '🇬🇮', name: 'Gibraltar' },
      { id: '+30', flag: '🇬🇷', name: 'Greece' },
      { id: '+299', flag: '🇬🇱', name: 'Greenland' },
      { id: '+1-473', flag: '🇬🇩', name: 'Grenada' },
      { id: '+590', flag: '🇬🇵', name: 'Guadeloupe' },
      { id: '+1-671', flag: '🇬🇺', name: 'Guam' },
      { id: '+502', flag: '🇬🇹', name: 'Guatemala' },
      { id: '+44-1481', flag: '🇬🇬', name: 'Guernsey' },
      { id: '+224', flag: '🇬🇳', name: 'Guinea' },
      { id: '+245', flag: '🇬🇼', name: 'Guinea-Bissau' },
      { id: '+592', flag: '🇬🇾', name: 'Guyana' },
      { id: '+509', flag: '🇭🇹', name: 'Haiti' },
      { id: '+504', flag: '🇭🇳', name: 'Honduras' },
      { id: '+852', flag: '🇭🇰', name: 'Hong Kong' },
      { id: '+36', flag: '🇭🇺', name: 'Hungary' },
      { id: '+354', flag: '🇮🇸', name: 'Iceland' },
      { id: '+91', flag: '🇮🇳', name: 'India' },
      { id: '+62', flag: '🇮🇩', name: 'Indonesia' },
      { id: '+98', flag: '🇮🇷', name: 'Iran' },
      { id: '+964', flag: '🇮🇶', name: 'Iraq' },
      { id: '+353', flag: '🇮🇪', name: 'Ireland' },
      { id: '+44-1624', flag: '🇮🇲', name: 'Isle of Man' }, 
      { id: '+39', flag: '🇮🇹', name: 'Italy' },
      { id: '+225', flag: '🇨🇮', name: 'Ivory Coast' },
      { id: '+1-876', flag: '🇯🇲', name: 'Jamaica' },
      { id: '+81', flag: '🇯🇵', name: 'Japan' },
      { id: '+44-1534', flag: '🇯🇪', name: 'Jersey' },
      { id: '+962', flag: '🇯🇴', name: 'Jordan' },
      { id: '+7', flag: '🇰🇿', name: 'Kazakhstan' },
      { id: '+254', flag: '🇰🇪', name: 'Kenya' },
      { id: '+686', flag: '🇰🇮', name: 'Kiribati' },
      { id: '+965', flag: '🇰🇼', name: 'Kuwait' },
      { id: '+996', flag: '🇰🇬', name: 'Kyrgyzstan' },
      { id: '+856', flag: '🇱🇦', name: 'Laos' },
      { id: '+371', flag: '🇱🇻', name: 'Latvia' },
      { id: '+961', flag: '🇱🇧', name: 'Lebanon' },
      { id: '+266', flag: '🇱🇸', name: 'Lesotho' },
      { id: '+231', flag: '🇱🇷', name: 'Liberia' },
      { id: '+218', flag: '🇱🇾', name: 'Libya' },
      { id: '+423', flag: '🇱🇮', name: 'Liechtenstein' },
      { id: '+370', flag: '🇱🇹', name: 'Lithuania' },
      { id: '+352', flag: '🇱🇺', name: 'Luxembourg' },
      { id: '+853', flag: '🇲🇴', name: 'Macau' },
      { id: '+389', flag: '🇲🇰', name: 'North Macedonia' },
      { id: '+261', flag: '🇲🇬', name: 'Madagascar' },
      { id: '+265', flag: '🇲🇼', name: 'Malawi' },
      { id: '+60', flag: '🇲🇾', name: 'Malaysia' },
      { id: '+960', flag: '🇲🇻', name: 'Maldives' },
      { id: '+223', flag: '🇲🇱', name: 'Mali' },
      { id: '+356', flag: '🇲🇹', name: 'Malta' },
      { id: '+692', flag: '🇲🇭', name: 'Marshall Islands' },
      { id: '+596', flag: '🇲🇶', name: 'Martinique' },
      { id: '+222', flag: '🇲🇷', name: 'Mauritania' },
      { id: '+230', flag: '🇲🇺', name: 'Mauritius' },
      { id: '+262', flag: '🇾🇹', name: 'Mayotte' },
      { id: '+52', flag: '🇲🇽', name: 'Mexico' },
      { id: '+691', flag: '🇫🇲', name: 'Micronesia' },
      { id: '+373', flag: '🇲🇩', name: 'Moldova' },
      { id: '+377', flag: '🇲🇨', name: 'Monaco' },
      { id: '+976', flag: '🇲🇳', name: 'Mongolia' },
      { id: '+382', flag: '🇲🇪', name: 'Montenegro' },
      { id: '+1-664', flag: '🇲🇸', name: 'Montserrat' },
      { id: '+212', flag: '🇲🇦', name: 'Morocco' },
      { id: '+258', flag: '🇲🇿', name: 'Mozambique' },
      { id: '+95', flag: '🇲🇲', name: 'Myanmar' },
      { id: '+264', flag: '🇳🇦', name: 'Namibia' },
      { id: '+674', flag: '🇳🇷', name: 'Nauru' },
      { id: '+977', flag: '🇳🇵', name: 'Nepal' },
      { id: '+31', flag: '🇳🇱', name: 'Netherlands' },
      { id: '+687', flag: '🇳🇨', name: 'New Caledonia' },
      { id: '+64', flag: '🇳🇿', name: 'New Zealand' },
      { id: '+505', flag: '🇳🇮', name: 'Nicaragua' },
      { id: '+227', flag: '🇳🇪', name: 'Niger' },
      { id: '+234', flag: '🇳🇬', name: 'Nigeria' },
      { id: '+683', flag: '🇳🇺', name: 'Niue' },
      { id: '+850', flag: '🇰🇵', name: 'North Korea' },
      { id: '+1-670', flag: '🇲🇵', name: 'Northern Mariana Islands' },
      { id: '+47', flag: '🇳🇴', name: 'Norway' },
      { id: '+968', flag: '🇴🇲', name: 'Oman' },
      { id: '+92', flag: '🇵🇰', name: 'Pakistan' },
      { id: '+680', flag: '🇵🇼', name: 'Palau' },
      { id: '+970', flag: '🇵🇸', name: 'Palestine' },
      { id: '+507', flag: '🇵🇦', name: 'Panama' },
      { id: '+675', flag: '🇵🇬', name: 'Papua New Guinea' },
      { id: '+595', flag: '🇵🇾', name: 'Paraguay' },
      { id: '+51', flag: '🇵🇪', name: 'Peru' },
      { id: '+63', flag: '🇵🇭', name: 'Philippines' },
      { id: '+48', flag: '🇵🇱', name: 'Poland' },
      { id: '+351', flag: '🇵🇹', name: 'Portugal' },
      { id: '+1-787', flag: '🇵🇷', name: 'Puerto Rico' },
      { id: '+974', flag: '🇶🇦', name: 'Qatar' },
      { id: '+242', flag: '🇨🇬', name: 'Republic of the Congo' },
      { id: '+40', flag: '🇷🇴', name: 'Romania' },
      { id: '+7', flag: '🇷🇺', name: 'Russia' },
      { id: '+250', flag: '🇷🇼', name: 'Rwanda' },
      { id: '+590', flag: '🇧🇱', name: 'Saint Barthélemy' },
      { id: '+290', flag: '🇸🇭', name: 'Saint Helena' },
      { id: '+1-869', flag: '🇰🇳', name: 'Saint Kitts and Nevis' },
      { id: '+1-758', flag: '🇱🇨', name: 'Saint Lucia' },
      { id: '+590', flag: '🇲🇫', name: 'Saint Martin' },
      { id: '+508', flag: '🇵🇲', name: 'Saint Pierre and Miquelon' },
      { id: '+1-784', flag: '🇻🇨', name: 'Saint Vincent and the Grenadines' },
      { id: '+685', flag: '🇼🇸', name: 'Samoa' },
      { id: '+378', flag: '🇸🇲', name: 'San Marino' },
      { id: '+239', flag: '🇸🇹', name: 'Sao Tome and Principe' },
      { id: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
      { id: '+221', flag: '🇸🇳', name: 'Senegal' },
      { id: '+381', flag: '🇷🇸', name: 'Serbia' },
      { id: '+248', flag: '🇸🇨', name: 'Seychelles' },
      { id: '+232', flag: '🇸🇱', name: 'Sierra Leone' },
      { id: '+65', flag: '🇸🇬', name: 'Singapore' },
      { id: '+1-721', flag: '🇸🇽', name: 'Sint Maarten' },
      { id: '+421', flag: '🇸🇰', name: 'Slovakia' },
      { id: '+386', flag: '🇸🇮', name: 'Slovenia' },
      { id: '+677', flag: '🇸🇧', name: 'Solomon Islands' },
      { id: '+252', flag: '🇸🇴', name: 'Somalia' },
      { id: '+27', flag: '🇿🇦', name: 'South Africa' },
      { id: '+82', flag: '🇰🇷', name: 'South Korea' },
      { id: '+211', flag: '🇸🇸', name: 'South Sudan' },
      { id: '+34', flag: '🇪🇸', name: 'Spain' },
      { id: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
      { id: '+249', flag: '🇸🇩', name: 'Sudan' },
      { id: '+597', flag: '🇸🇷', name: 'Suriname' },
      { id: '+47', flag: '🇸🇯', name: 'Svalbard and Jan Mayen' },
      { id: '+268', flag: '🇸🇿', name: 'Eswatini' },
      { id: '+46', flag: '🇸🇪', name: 'Sweden' },
      { id: '+41', flag: '🇨🇭', name: 'Switzerland' },
      { id: '+963', flag: '🇸🇾', name: 'Syria' },
      { id: '+886', flag: '🇹🇼', name: 'Taiwan' },
      { id: '+992', flag: '🇹🇯', name: 'Tajikistan' },
      { id: '+255', flag: '🇹🇿', name: 'Tanzania' },
      { id: '+66', flag: '🇹🇭', name: 'Thailand' },
      { id: '+670', flag: '🇹🇱', name: 'Timor-Leste' },
      { id: '+228', flag: '🇹🇬', name: 'Togo' },
      { id: '+690', flag: '🇹🇰', name: 'Tokelau' },
      { id: '+676', flag: '🇹🇴', name: 'Tonga' },
      { id: '+1-868', flag: '🇹🇹', name: 'Trinidad and Tobago' },
      { id: '+216', flag: '🇹🇳', name: 'Tunisia' },
      { id: '+90', flag: '🇹🇷', name: 'Turkey' },
      { id: '+993', flag: '🇹🇲', name: 'Turkmenistan' },
      { id: '+1-649', flag: '🇹🇨', name: 'Turks and Caicos Islands' },
      { id: '+688', flag: '🇹🇻', name: 'Tuvalu' },
      { id: '+256', flag: '🇺🇬', name: 'Uganda' },
      { id: '+380', flag: '🇺🇦', name: 'Ukraine' },
      { id: '+971', flag: '🇦🇪', name: 'UAE' },
      { id: '+44', flag: '🇬🇧', name: 'UK' },
      { id: '+1', flag: '🇺🇸', name: 'USA' },
      { id: '+598', flag: '🇺🇾', name: 'Uruguay' },
      { id: '+998', flag: '🇺🇿', name: 'Uzbekistan' },
      { id: '+678', flag: '🇻🇺', name: 'Vanuatu' },
      { id: '+379', flag: '🇻🇦', name: 'Vatican City' },
      { id: '+58', flag: '🇻🇪', name: 'Venezuela' },
      { id: '+84', flag: '🇻🇳', name: 'Vietnam' },
      { id: '+681', flag: '🇼🇫', name: 'Wallis and Futuna' },
      { id: '+967', flag: '🇾🇪', name: 'Yemen' },
      { id: '+260', flag: '🇿🇲', name: 'Zambia' },
      { id: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
    ],
    [],
  );

  const currentCountry = isCustomCode ? { id: customCode || countryCode, flag: '🌍', name: 'Custom' } : countries.find(c => c.id === countryCode) || countries.find(c => c.id === '+961') || countries[0];
  const currentMeta = COUNTRY_META[countryCode] || {};
  const dynamicPlaceholder = currentMeta.example || '123 456 7890';
  const hasError = !!(error && error !== 'users');

  const applyValidation = (code, num) => {
    const { valid, message } = validateByCountry(code, num, required);
    if (!valid && setError && name) setError(name, { type: 'manual', message });
    else if (valid && clearErrors && name) clearErrors(name);
  };

  const handleCountryChange = e => {
    const code = e.target.value;

    if (code === '__custom__') {
      setIsCustomCode(true);
      const nextCode = customCode || '+';
      onChange?.(number ? `${nextCode} ${number}` : nextCode);
      return;
    }

    setIsCustomCode(false);
    setCustomCode('');
    onChange?.(number ? `${code} ${number}` : code || '');
    applyValidation(code, number);
  };

  const handleNumberChange = e => {
    const num = e.target.value;
    onChange?.(num ? `${countryCode} ${num}` : countryCode);
    applyValidation(countryCode, num);
  };

  const handleCustomCodeChange = e => {
    let val = e.target.value.replace(/[^\d+]/g, '');

    if (!val.startsWith('+')) val = `+${val.replace(/\+/g, '')}`;

    setCustomCode(val);
    onChange?.(number ? `${val} ${number}` : val);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className='mb-1.5 block text-sm font-semibold' style={{ color: colors.primary[700] }}>
          {label}
          {required && <span className='text-rose-500 ltr:ml-0.5 rtl:mr-0.5'>*</span>}
        </label>
      )}
 
      <div
        dir='ltr'
        className='flex items-stretch rounded-lg border-2 bg-white overflow-hidden transition-colors duration-200'
        style={{
          borderColor: hasError ? '#f43f5e' : colors.primary[300],
          background: hasError ? '#fff8f8' : 'white',
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}>
        {/* ── Country selector ── */}
        <div
          className='relative flex items-center flex-shrink-0'
          style={{
            borderRight: `2px solid ${hasError ? '#fecaca' : colors.primary[100]}`,
            background: hasError ? 'rgba(244,63,94,0.04)' : colors.primary[50],
          }}>
          {/* Flag + code visible label */}
          <div className='flex items-center gap-1.5 pl-3 pr-1 pointer-events-none select-none'>
            <span className='text-base leading-none'>{currentCountry.flag}</span>
            <span className='text-sm font-bold tabular-nums' style={{ color: colors.primary[800] }}>
              {countryCode}
            </span>
          </div>

          <ChevronDown className='w-3.5 h-3.5 mr-2 flex-shrink-0 pointer-events-none' style={{ color: colors.primary[400] }} />

          <select value={isCustomCode ? '__custom__' : countryCode} onChange={handleCountryChange} disabled={disabled} aria-label='Country code' className='absolute inset-0 opacity-0 w-full cursor-pointer'>
            <option value='__custom__'>🌍 Custom</option>
            {countries.map(c => (
              <option key={c.id} value={c.id}>
                {c.flag} {c.name} ({c.id})
              </option>
            ))}
          </select>
        </div>

        {/* ── Number input ── */}
				
       <div className="relative flex items-center flex-1 min-w-0">
	{isCustomCode && (
		<input
			type="text"
			dir="ltr"
			placeholder="+961"
			value={customCode}
			onChange={handleCustomCodeChange}
			disabled={disabled}
			className="h-12 w-14 px-3 text-sm font-medium outline-none border-r bg-white"
			style={{ color: colors.primary[900], borderColor: colors.primary[100] }}
		/>
	)}

	<input
		type="tel"
		dir="ltr"
		placeholder={dynamicPlaceholder}
		value={number}
		onChange={handleNumberChange}
		disabled={disabled}
		className="h-12 w-full px-4 text-sm font-medium outline-none placeholder:text-slate-400 bg-transparent"
		style={{ color: colors.primary[900] }}
		aria-invalid={hasError}
	/>
</div>
      </div>

      {/* Error message */}
      {hasError && <ErrorBlock message={error} />}
    </div>
  );
}

/* ─────────────────────── Select (portal) ─────────────────────── */
function Select({ options = [], value = null, onChange = () => {}, placeholder, searchable = true, disabled = false, clearable = true, className = '', label, allowCustom = false, createHint, required = false, error = '' }) {
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

  const selectedOption = useMemo(() => options.find(o => String(o.id) === String(value)) || null, [options, value]);
  const buttonLabel = useMemo(() => {
    if (selectedOption) return selectedOption.label;
    if (typeof value === 'string' && value.trim()) return value;
    return placeholder || t('select.placeholder');
  }, [selectedOption, value, placeholder, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, query, searchable]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.some(o => String(o.label).toLowerCase() === q) : false;
  }, [options, query]);

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
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
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, updateCoords]);
  useEffect(() => {
    if (!open) return;
    const onDocClick = e => {
      if (buttonRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, closeMenu]);

  useEffect(() => {
    if (createMode) setTimeout(() => createInputRef.current?.focus(), 0);
  }, [createMode]);

  const pick = item => {
    onChange(item.id);
    closeMenu();
    buttonRef.current?.focus();
  };
  const clear = e => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setActiveIndex(-1);
  };
  const createFromText = text => {
    const tVal = (text ?? '').trim();
    if (!tVal) return;
    onChange(tVal);
    closeMenu();
    buttonRef.current?.focus();
  };

  const errorState = Boolean(error);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-semibold' style={{ color: colors.primary[700] }}>
          {label}
          {required && <span className='text-rose-500 ml-0.5'>*</span>}
        </label>
      )}
      <button
        type='button'
        ref={buttonRef}
        onClick={() => (open ? closeMenu() : openMenu())}
        disabled={disabled}
        className='h-12 w-full inline-flex items-center justify-between rounded-lg border-2 bg-white px-4 text-sm font-medium cursor-pointer transition-colors duration-200 outline-none'
        style={{
          borderColor: disabled ? colors.primary[200] : errorState ? '#f43f5e' : open ? colors.primary[400] : colors.primary[300],
          background: errorState ? '#fff8f8' : 'white',
          opacity: disabled ? 0.65 : 1,
          color: selectedOption || (typeof value === 'string' && value?.trim()) ? colors.primary[900] : colors.primary[400],
        }}
        aria-haspopup='listbox'
        aria-expanded={open}>
        <span className='truncate text-left'>{buttonLabel}</span>
        <span className='ml-2 flex items-center gap-1.5'>
          {clearable && (selectedOption || (typeof value === 'string' && value)) && !disabled && <X className='h-3.5 w-3.5 text-slate-400 hover:text-slate-600' onClick={clear} />}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: colors.primary[500] }} />
        </span>
      </button>

      <ErrorBlock message={errorState ? error : null} />

      {portalReady &&
        open &&
        createPortal(
          <div role='listbox' className='fixed z-[99999999] mt-0' style={{ top: coords.top, left: coords.left, width: coords.width }}>
            <div ref={listRef} className='max-h-72 overflow-auto rounded-lg border-2 bg-white shadow-2xl' style={{ borderColor: colors.primary[200] }}>
              {searchable && !createMode && (
                <div className='p-2.5 border-b sticky top-0 bg-white z-10' style={{ borderColor: colors.primary[100] }}>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5' style={{ color: colors.primary[400] }} />
                    <input
                      className='w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none font-medium'
                      style={{ borderColor: colors.primary[200], color: colors.primary[900] }}
                      placeholder={t('select.search_placeholder')}
                      value={query}
                      onChange={e => {
                        setQuery(e.target.value);
                        setActiveIndex(0);
                      }}
                      autoFocus
                    />
                  </div>
                </div>
              )}
              <ul className='py-1'>
                {filtered.length === 0 && <li className='px-3 py-2 text-sm text-slate-400'>{t('select.no_results')}</li>}
                {filtered.map((item, idx) => {
                  const isSelected = selectedOption?.id === item.id;
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      key={item.id}
                      role='option'
                      aria-selected={isSelected}
                      className='mx-1 my-0.5 rounded-lg px-3 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors'
                      style={{
                        background: isActive || isSelected ? colors.primary[50] : 'transparent',
                        color: isSelected ? colors.primary[700] : colors.primary[900],
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => pick(item)}>
                      <span className='truncate'>{item.label}</span>
                      {isSelected && <Check className='h-3.5 w-3.5' style={{ color: colors.primary[600] }} />}
                    </li>
                  );
                })}
              </ul>
              {allowCustom && !createMode && (
                <div className='p-2 border-t sticky bottom-0 bg-white' style={{ borderColor: colors.primary[100] }}>
                  <button type='button' onClick={() => setCreateMode(true)} className='w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-sm border' style={{ borderColor: colors.primary[300] }}>
                    <Plus className='w-3.5 h-3.5' />
                    {createHint || t('select.create_hint')}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ─────────────────────── File input ─────────────────────── */
function PrettyFileInput({ label, required, error, valueNames = [], onPickMany, onClear, accept, disabled = false, multiple = true }) {
  const { colors } = useTheme();
  const t = useTranslations('publicForm');
  const inputRef = useRef(null);
  const hasError = !!error;
  const hasFiles = valueNames?.length > 0;

  return (
    <div className='w-full'>
      {label && (
        <label className='mb-1.5 block text-sm font-semibold' style={{ color: colors.primary[700] }}>
          {label} {required && <span className='text-rose-500'>*</span>}
        </label>
      )}

      <div
        className='rounded-lg border-2 transition-colors duration-200'
        style={{
          borderColor: disabled ? colors.primary[200] : hasError ? '#f43f5e' : hasFiles ? colors.primary[400] : colors.primary[300],
          background: hasError ? '#fff8f8' : hasFiles ? colors.primary[50] : 'white',
        }}>
        <input ref={inputRef} type='file' className='hidden' accept={accept} disabled={disabled} multiple={multiple} onChange={e => onPickMany(Array.from(e.target.files || []))} />

        {hasFiles ? (
          /* Files selected state */
          <div className='p-3 space-y-2'>
            {valueNames.map((n, i) => (
              <div key={i} className='flex items-center gap-2.5 rounded-lg border px-3 py-2' style={{ borderColor: colors.primary[200], background: 'white' }}>
                <FileIcon className='w-4 h-4 flex-shrink-0' style={{ color: colors.primary[500] }} />
                <span className='text-sm font-medium truncate flex-1' style={{ color: colors.primary[900] }}>
                  {n}
                </span>
              </div>
            ))}
            <div className='flex items-center gap-2 pt-1'>
              <button
                type='button'
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = '';
                  onClear();
                }}
                className='text-xs font-semibold px-3 h-8 rounded-lg border transition-colors'
                style={{ borderColor: colors.primary[200], color: colors.primary[600] }}>
                {t('fileInput.remove_all')}
              </button>
              <button type='button' onClick={() => inputRef.current?.click()} disabled={disabled} className='text-xs font-semibold px-3 h-8 rounded-lg text-white transition-opacity' style={{ background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.to})` }}>
                {t('fileInput.choose_files')}
              </button>
            </div>
          </div>
        ) : (
          /* Empty drop zone */
          <button type='button' onClick={() => inputRef.current?.click()} disabled={disabled} className='w-full flex flex-col items-center justify-center gap-2 py-8 transition-colors' style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
            <div className='w-10 h-10 rounded-lg grid place-items-center' style={{ background: colors.primary[100] }}>
              <Upload className='w-5 h-5' style={{ color: colors.primary[600] }} />
            </div>
            <div className='text-center'>
              <p className='text-sm font-semibold' style={{ color: colors.primary[700] }}>
                {t('fileInput.choose_files')}
              </p>
              <p className='text-xs text-slate-400 mt-0.5'>{t('fileInput.no_files_selected')}</p>
            </div>
          </button>
        )}
      </div>

      <ErrorBlock message={error} />
    </div>
  );
}

/* ─────────────────────── Section header ─────────────────────── */
function SectionHeader({ icon: Icon, title, colors }) {
  return (
    <div className='flex items-center gap-3 mb-5 pb-4 border-b' style={{ borderColor: colors.primary[100] }}>
      <div className='w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0' style={{ background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})` }}>
        <Icon className='text-white w-4 h-4' />
      </div>
      <h2 className='text-base font-bold' style={{ color: colors.primary[900] }}>
        {title}
      </h2>
    </div>
  );
}

/* ─────────────────────── Main page ─────────────────────── */
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

  useEffect(() => {
    fetchForm();
  }, [params.id]);

  const fetchForm = async () => {
    try {
      const res = await api.get(`/forms/${params.id}/public`);
      const f = res?.data || null;
      const sorted = (f?.fields || []).slice().sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
      setForm({ ...f, fields: sorted });
    } catch (e) {
      toast.error(t('messages.load_failed'));
      setForm(null);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicFields = useMemo(() => (form?.fields || []).filter(f => f?.key !== 'email' && f?.key !== 'phone'), [form?.fields]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setClientIp(data?.ip || ''))
      .catch(() => setClientIp(''));
  }, []);

  const dynamicShape = useMemo(() => {
    const phoneRule = yup
      .string()
      .required(t('validation.phone_required'))
      .test('valid-phone', t('validation.phone_invalid'), value => {
        if (!value) return false;
        return String(value).replace(/\D/g, '').length >= 7;
      });

    const shape = {
      email: yup
        .string()
        .trim()
        .email(t('validation.email_invalid'))
        .notRequired()
        .transform(value => (value === '' ? undefined : value)),
      phone: phoneRule,
    };

    for (const field of dynamicFields) {
      if (!field?.required) continue;
      const label = field.label || field.key;
      switch (field.type) {
        case 'file':
          shape[field.key] = yup.array().of(yup.mixed()).default([]).min(1, t('validation.required_generic', { label }));
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
          shape[field.key] = yup.date().typeError(t('validation.date_invalid', { label })).required(t('validation.required_generic', { label }));
          break;
        case 'number':
          shape[field.key] = yup
            .number()
            .transform(v => (isNaN(v) ? undefined : v))
            .typeError(t('validation.number_type', { label }))
            .required(t('validation.required_generic', { label }));
          break;
        default:
          shape[field.key] = yup.string().trim().required(t('validation.required_generic', { label }));
      }
    }
    for (const field of dynamicFields) {
      if (field?.type === 'file' && !field?.required && !shape[field.key]) {
        shape[field.key] = yup.array().of(yup.mixed()).default([]).nullable();
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
  } = useForm({ resolver });

  useEffect(() => {
    if (!form?.fields?.length) return;
    dynamicFields.forEach(f => {
      if (f.type === 'file') setValue(f.key, [], { shouldValidate: false });
    });
  }, [form?.id, dynamicFields, setValue]);

  const buildDraftKey = formId => `publicFormDraft:${formId}`;
  function safeJsonParse(v) {
    try {
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!form?.id) return;
    const saved = safeJsonParse(localStorage.getItem(buildDraftKey(form.id)));
    if (!saved) return;
    const { __fileNames, ...values } = saved;
    reset(values, { keepErrors: true, keepDirty: true, keepTouched: true });
    if (__fileNames && typeof __fileNames === 'object') setFileNames(__fileNames);
  }, [form?.id, reset]);

  useEffect(() => {
    if (!form?.id) return;
    const key = buildDraftKey(form.id);
    const sub = watch(values => {
      const clean = { ...values };
      dynamicFields.forEach(f => {
        if (f.type === 'file') clean[f.key] = [];
      });
      clean.__fileNames = fileNames;
      localStorage.setItem(key, JSON.stringify(clean));
    });
    return () => sub.unsubscribe();
  }, [form?.id, watch, fileNames, dynamicFields]);

  const toYMD = d => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const watchAll = watch();

  const progress = useMemo(() => {
    if (!form) return 0;
    const requiredKeys = ['phone', ...dynamicFields.filter((f) => f.required).map((f) => f.key)];
    const vals = getValues();
    let filled = 0;
    requiredKeys.forEach(k => {
      const v = vals?.[k];
      if (Array.isArray(v)) {
        if (v.length) filled++;
      } else if (typeof v === 'boolean') {
        if (v) filled++;
      } else if (v instanceof Date) {
        if (v) filled++;
      } else if (v !== undefined && v !== null && String(v).trim() !== '') filled++;
    });
    return Math.round((filled / requiredKeys.length) * 100);
  }, [form, dynamicFields, getValues, watchAll]);

  const onSubmit = async data => {
    try {
      setIsSubmitting(true);
      const normalizedAnswers = { ...data };
      (form?.fields || []).forEach(f => {
        if (f.type === 'date' && normalizedAnswers[f.key]) normalizedAnswers[f.key] = toYMD(normalizedAnswers[f.key]);
      });
      normalizedAnswers.clientIp = clientIp || undefined;

      const fd = new FormData();
      fd.append('email', data.email || '');
      fd.append('phone', data.phone);
      const answersOnly = { ...normalizedAnswers };
      delete answersOnly.email;
      delete answersOnly.phone;

      (form?.fields || []).forEach(f => {
        if (f.type === 'file') {
          const v = answersOnly[f.key];
          if (Array.isArray(v) && v.length) {
            v.forEach(file => {
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

      // ✅ Redirect to thank-you page
      router.push('/thank-you');
    } catch (e) {
      const msg = e?.response?.data?.message || t('messages.submit_failed');
      const fieldErrors = e?.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        toast.error(Object.values(fieldErrors).flat().join('\n'));
      } else {
        toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Field renderers ── */
  const RadioGroup = ({ field, error }) => {
    const current = watch(field.key);
    return (
      <div className='space-y-2.5'>
        <label className='block text-sm font-semibold' style={{ color: colors.primary[800] }}>
          <MultiLangText>{field.label}</MultiLangText>
          {field.required && <span className='text-rose-500 ml-0.5'>*</span>}
        </label>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
          {(field.options || []).map(opt => {
            const active = current === opt;
            return (
              <label
                key={opt}
                className='flex items-center gap-3 rounded-lg border-2 p-3.5 cursor-pointer transition-colors duration-200'
                style={{
                  borderColor: active ? colors.primary[400] : colors.primary[200],
                  background: active ? colors.primary[50] : 'white',
                }}>
                <div
                  className='relative flex-shrink-0 w-4.5 h-4.5 rounded-full border-2 transition-colors'
                  style={{
                    borderColor: active ? colors.primary[500] : colors.primary[300],
                    background: active ? colors.primary[500] : 'white',
                  }}>
                  {active && <div className='absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white' />}
                </div>
                <input type='radio' value={opt} {...register(field.key)} className='sr-only' />
                <MultiLangText className='text-sm font-medium' style={{ color: colors.primary[800] }}>
                  {opt}
                </MultiLangText>
                {active && <Check className='ml-auto w-4 h-4 flex-shrink-0' style={{ color: colors.primary[600] }} />}
              </label>
            );
          })}
        </div>
        {error?.message && <ErrorBlock message={error.message} />}
      </div>
    );
  };

  const ChecklistGroup = ({ field, error }) => {
    const selected = watch(field.key) || [];
    const toggle = useCallback(
      val => {
        const set = new Set(selected);
        set.has(val) ? set.delete(val) : set.add(val);
        setValue(field.key, Array.from(set), { shouldValidate: true, shouldDirty: true });
      },
      [selected, field.key],
    );

    return (
      <div className='space-y-2.5'>
        <label className='block text-sm font-semibold' style={{ color: colors.primary[800] }}>
          <MultiLangText>{field.label}</MultiLangText>
          {field.required && <span className='text-rose-500 ml-0.5'>*</span>}
        </label>
        <div className='flex flex-wrap gap-2'>
          {(field.options || []).map(opt => {
            const active = selected.includes(opt);
            return (
              <button
                type='button'
                key={opt}
                onClick={() => toggle(opt)}
                className='px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors duration-200'
                style={{
                  background: active ? `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.to})` : 'white',
                  color: active ? 'white' : colors.primary[700],
                  borderColor: active ? 'transparent' : colors.primary[200],
                }}>
                {opt}
              </button>
            );
          })}
        </div>
        {error?.message && <ErrorBlock message={error.message} />}
      </div>
    );
  };

  const renderFieldInput = field => {
    const fieldValue = watch(field.key);
    const error = errors?.[field.key];

    switch (field.type) {
      case 'text':
      case 'number':
      case 'email':
        return <Input label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || ''} type={field.type === 'number' ? 'number' : field.type} error={error?.message} required={field.required} registration={register(field.key)} />;

      case 'date':
        return (
          <div className='w-full'>
            <label className='mb-1.5 block text-sm font-semibold' style={{ color: colors.primary[700] }}>
              <MultiLangText>{field.label}</MultiLangText>
              {field.required && <span className='text-rose-500 ml-0.5'>*</span>}
            </label>
            <div className='relative rounded-lg border-2 bg-white overflow-hidden transition-colors' style={{ borderColor: error ? '#f43f5e' : colors.primary[300] }}>
              <Flatpickr value={fieldValue} onChange={([date]) => setValue(field.key, date, { shouldValidate: true })} options={{ dateFormat: 'Y-m-d', allowInput: true }} className='w-full h-12 px-4 pr-11 text-sm font-medium outline-none bg-transparent' placeholder={field.placeholder || t('fields.date.placeholder')} style={{ color: colors.primary[900] }} />
              <FiCalendar className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4' style={{ color: error ? '#f43f5e' : colors.primary[400] }} />
            </div>
            {error && <ErrorBlock message={error.message} />}
          </div>
        );

      case 'textarea':
        return <Textarea label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || ''} rows={1} error={error?.message} required={field.required} registration={register(field.key)} />;

      case 'select':
        return <Select label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || t('fields.select.placeholder')} options={(field.options || []).map(opt => ({ id: opt, label: opt }))} value={fieldValue} onChange={val => setValue(field.key, val, { shouldValidate: true })} required={!!field.required} error={error?.message} />;

      case 'radio':
        return <RadioGroup field={field} error={error} />;

      case 'checkbox':
        return (
          <div className='py-1'>
            <CheckBox label={<MultiLangText>{field.label}</MultiLangText>} initialChecked={!!fieldValue} onChange={checked => setValue(field.key, checked, { shouldValidate: true })} />
            {error && <ErrorBlock message={error.message} />}
          </div>
        );

      case 'checklist':
        return <ChecklistGroup field={field} error={error} />;

      case 'file': {
        const files = watch(field.key) || [];
        return <PrettyFileInput label={<MultiLangText>{field.label}</MultiLangText>} required={field.required} error={error?.message} valueNames={(files || []).map(f => (f instanceof File ? f.name : String(f)))} accept='*/*' onPickMany={picked => setValue(field.key, picked, { shouldValidate: true, shouldDirty: true })} onClear={() => setValue(field.key, [], { shouldValidate: true, shouldDirty: true })} />;
      }

      case 'phone':
        return <PhoneField name={field.key} label={<MultiLangText>{field.label}</MultiLangText>} value={fieldValue || ''} required={field.required} error={error?.message} setError={setError} clearErrors={clearErrors} onChange={val => setValue(field.key, val, { shouldValidate: true })} />;

      default:
        return <Input label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || ''} error={error?.message} required={field.required} registration={register(field.key)} />;
    }
  };

  /* ── Skeleton ── */
  if (isLoading) {
    return (
      <div className='min-h-screen' style={{ background: colors.primary[50] }}>
        <div className='sticky top-0 z-20 bg-white border-b' style={{ borderColor: colors.primary[200] }}>
          <div className='max-w-3xl mx-auto px-4 sm:px-6 py-4'>
            <div className='flex items-center justify-between gap-4 animate-pulse'>
              <div className='h-6 w-52 rounded-lg bg-slate-200' />
              <div className='h-2 w-36 rounded-full bg-slate-200' />
            </div>
          </div>
        </div>
        <div className='max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4 animate-pulse'>
          <div className='h-10 w-full rounded-lg bg-slate-200' />
          <div className='h-10 w-full rounded-lg bg-slate-200' />
          <div className='h-10 w-2/3 rounded-lg bg-slate-200' />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4' style={{ background: colors.primary[50] }}>
        <div className='text-center'>
          <div className='mx-auto w-16 h-16 rounded-lg grid place-items-center mb-5' style={{ background: colors.primary[100] }}>
            <FiXCircle className='w-8 h-8' style={{ color: colors.primary[400] }} />
          </div>
          <h3 className='text-xl font-bold mb-2' style={{ color: colors.primary[900] }}>
            {t('errors.not_found_title')}
          </h3>
          <p className='text-sm' style={{ color: colors.primary[600] }}>
            {t('errors.not_found_subtitle')}
          </p>
        </div>
      </div>
    );
  }

  const progressClamped = isNaN(progress) ? 0 : progress;

  return (
    <div className='min-h-screen pb-28' style={{ background: `linear-gradient(160deg, ${colors.primary[50]} 0%, white 50%, ${colors.primary[50]} 100%)` }}>
      {/* ── Sticky header ── */}
      <div className='sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b' style={{ borderColor: colors.primary[150] || colors.primary[200] }}>
        <div className='max-w-3xl mx-auto px-4 sm:px-6 py-4'>
          <div className='flex items-center gap-4'>
            <div className='flex-1 min-w-0'>
              <MultiLangText className='text-base font-bold truncate' style={{ color: colors.primary[900] }}>
                {form.title}
              </MultiLangText>
            </div>

            {/* Progress */}
            <div className='flex-shrink-0 flex items-center gap-3'>
              <div className='w-28 hidden sm:block'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[11px] font-semibold' style={{ color: colors.primary[600] }}>
                    {t('header.progress_label')}
                  </span>
                  <span className='text-[11px] font-bold tabular-nums' style={{ color: colors.primary[700] }}>
                    {progressClamped}%
                  </span>
                </div>
                <div className='h-1.5 rounded-full overflow-hidden' style={{ background: colors.primary[100] }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressClamped}%` }} transition={{ type: 'spring', stiffness: 120, damping: 22 }} className='h-full rounded-full' style={{ background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.to})` }} />
                </div>
              </div>

              {/* Circle on mobile */}
              <div className='sm:hidden relative w-10 h-10'>
                <svg className='w-10 h-10 -rotate-90' viewBox='0 0 36 36'>
                  <circle cx='18' cy='18' r='15.9' fill='none' stroke={colors.primary[100]} strokeWidth='3' />
                  <circle cx='18' cy='18' r='15.9' fill='none' stroke={colors.gradient.from} strokeWidth='3' strokeDasharray={`${progressClamped} ${100 - progressClamped}`} strokeDashoffset='0' strokeLinecap='round' />
                </svg>
                <span className='absolute inset-0 flex items-center justify-center text-[10px] font-bold' style={{ color: colors.primary[700] }}>
                  {progressClamped}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className='max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5'>
        {/* Card */}
        <div
          className='bg-white rounded-lg border overflow-hidden'
          style={{
            borderColor: colors.primary[150] || colors.primary[200],
            boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 8px 28px rgba(15,23,42,0.07)',
          }}>
          {/* ── Contact section ── */}
          <div className='p-6 sm:p-8 border-b' style={{ borderColor: colors.primary[100] }}>
            <SectionHeader icon={FiUser} title={t('sections.contact')} colors={colors} />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
              <Input label={t('fields.email.label')} type='email' placeholder={t('fields.email.placeholder')} error={errors?.email?.message} icon={<FiMail size={16} />} required registration={register('email')} />
              <PhoneField name='phone' label={t('fields.phone.label')} required value={watch('phone') || ''} error={errors?.phone?.message} setError={setError} clearErrors={clearErrors} onChange={val => setValue('phone', val, { shouldValidate: true })} />
            </div>
          </div>

          {/* ── Dynamic fields section ── */}
          {dynamicFields.length > 0 && (
            <div className='p-6 sm:p-8'>
              <SectionHeader icon={FiAlertCircle} title={t('sections.additional')} colors={colors} />
              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                {dynamicFields.map(field => (
                  <div key={field.id ?? field.key} className={['radio', 'checklist', 'textarea', 'file'].includes(field.type) ? 'md:col-span-2' : ''}>
                    {renderFieldInput(field)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky submit bar ── */}
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }} className='fixed bottom-0 left-0 right-0 z-30 pointer-events-none'>
          <div className='pointer-events-auto border-t bg-white/95 backdrop-blur-md' style={{ borderColor: colors.primary[150] || colors.primary[200] }}>
            <div className='max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4'>
              <p className='flex-1 text-sm font-medium hidden sm:block' style={{ color: colors.primary[600] }}>
                {t('footer.review_before_submit')}
              </p>

              <button
                type='submit'
                disabled={isSubmitting}
                className='ml-auto flex max-md:!mx-auto items-center gap-2 h-11 px-7 rounded-lg text-white text-sm font-bold transition-opacity'
                style={{
                  background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.via || colors.gradient.to}, ${colors.gradient.to})`,
                  boxShadow: `0 4px 16px ${colors.primary[200]}`,
                  opacity: isSubmitting ? 0.75 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}>
                {isSubmitting ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className='w-4 h-4 border-2 border-white border-t-transparent rounded-full' />
                    <span className='hidden sm:inline'>{t('cta.submitting')}</span>
                  </>
                ) : (
                  <>
                    <FiSend size={15} />
                    <span>{t('cta.submit')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
