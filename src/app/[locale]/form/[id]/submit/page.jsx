'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import api from '@/utils/axios';
import { FiXCircle, FiSend, FiCalendar, FiUpload, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';

import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Search, Plus, Save, CircleX } from 'lucide-react';

// Atoms
import Textarea from '@/components/atoms/Textarea';
import CheckBox from '@/components/atoms/CheckBox';
import Button from '@/components/atoms/Button';
import AttachFilesButton from '@/components/atoms/AttachFilesButton';
import MultiLangText from '@/components/atoms/MultiLangText';

export default function FormSubmissionPage() {
  const params = useParams();
  const router = useRouter();

  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileNames, setFileNames] = useState({}); // { [field.key]: "name.ext" }
  const [clientIp, setClientIp] = useState('');

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
      toast.error('Failed to load form');
      setForm(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setClientIp(data?.ip || ''))
      .catch(() => setClientIp(''));
  }, []);

  // Accept any phone format as long as it has 7–15 digits total
  const phoneRule = yup
    .string()
    .required('Phone is required')
    .test('valid-phone', 'Invalid phone number', value => {
      if (!value) return false;
      const digits = String(value).replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    });

  // Build dynamic validation
  const dynamicShape = useMemo(() => {
    const shape = {
      email: yup.string().email('Invalid email format').required('Email is required'),
      phone: phoneRule,
    };

    if (form?.fields?.length) {
      for (const field of form.fields) {
        if (!field?.required) continue;

        const label = field.label || field.key;

        switch (field.type) {
          case 'file':
            shape[field.key] = yup.mixed().test('file', `${label} is required`, v => v instanceof File || typeof v === 'string');
            break;

          case 'checklist':
            shape[field.key] = yup.array().of(yup.string()).min(1, `${label} is required`);
            break;

          case 'checkbox':
            shape[field.key] = yup.boolean().oneOf([true], `${label} is required`);
            break;

          case 'phone':
            shape[field.key] = yup
              .string()
              .required(`${label} is required`)
              .matches(/^(9665|05)[0-9]{8}$/, `${label} must be a valid Saudi number`);
            break;

          case 'date':
            shape[field.key] = yup.date().typeError(`${label} must be a valid date`).required(`${label} is required`);
            break;

          case 'number':
            shape[field.key] = yup
              .number()
              .transform(v => (isNaN(v) ? undefined : v))
              .typeError(`${label} must be a number`)
              .required(`${label} is required`);
            break;

          default:
            shape[field.key] = yup.string().trim().required(`${label} is required`);
        }
      }
    }
    return yup.object().shape(shape);
  }, [form]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: form ? yupResolver(dynamicShape) : undefined,
  });

  // Helpers
  const toYMD = d => {
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
    const requiredKeys = ['email', 'phone', ...form.fields.filter(f => f.required).map(f => f.key)];
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
      } else if (v !== undefined && v !== null && String(v).trim() !== '') {
        filled++;
      }
    });
    return Math.round((filled / requiredKeys.length) * 100);
  }, [form, getValues, watchAll]);

  const onSubmit = async data => {
    try {
      setIsSubmitting(true);

      // Normalize date fields to YYYY-MM-DD
      const normalizedAnswers = { ...data };
      (form?.fields || []).forEach(f => {
        if (f.type === 'date' && normalizedAnswers[f.key]) {
          normalizedAnswers[f.key] = toYMD(normalizedAnswers[f.key]);
        }
      });

      normalizedAnswers.clientIp = clientIp || undefined;

      const payload = {
        email: data.email,
        phone: data.phone,
        answers: normalizedAnswers,
      };
      delete payload.answers.email;
      delete payload.answers.phone;

      await api.post(`/forms/${params.id}/submit`, payload);

      toast.success('Form submitted successfully!');
      router.push('/thank-you');
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Submission failed';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderErrorText = err => {
    if (!err) return null;
    return (
      <p className='mt-1.5 flex items-center gap-1.5 text-xs text-rose-600'>
        <FiAlertCircle className='inline-block' />
        {err.message}
      </p>
    );
  };

  // Radio as cards
  const RadioGroup = ({ field, error }) => {
    const current = watch(field.key);
    return (
      <div className='space-y-3'>
        <label className='block text-sm font-medium text-slate-700'>
          <MultiLangText>{field.label}</MultiLangText>
          {field.required && <span className='text-rose-500 ml-1'>*</span>}
        </label>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
          {(field.options || []).map(opt => {
            const active = current === opt;
            return (
              <label
                key={opt}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition
                ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}
              `}>
                <div className='flex items-center gap-3'>
                  <input type='radio' value={opt} {...register(field.key)} className='h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300' />
                  <MultiLangText className='text-sm text-slate-800'>{opt}</MultiLangText>
                </div>
                {active && <FiCheck className='text-indigo-600' />}
              </label>
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
      val => {
        const set = new Set(selected);
        if (set.has(val)) set.delete(val);
        else set.add(val);
        setValue(field.key, Array.from(set), { shouldValidate: true, shouldDirty: true });
      },
      [selected, setValue, field.key],
    );
    return (
      <div className='space-y-3'>
        <label className='block text-sm font-medium text-slate-700'>
          <MultiLangText>{field.label}</MultiLangText>
          {field.required && <span className='text-rose-500 ml-1'>*</span>}
        </label>
        <div className='flex flex-wrap gap-2'>
          {(field.options || []).map(opt => {
            const active = selected.includes(opt);
            return (
              <button
                type='button'
                key={opt}
                onClick={() => toggle(opt)}
                className={`px-3 py-1.5 rounded-full text-sm border transition
                ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'}
              `}>
                {opt}
              </button>
            );
          })}
        </div>
        {renderErrorText(error)}
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
        return <Input label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || ''} type={field.type} error={error?.message} {...register(field.key)} />;

      case 'date':
        return (
          <div className='w-full'>
            <div className='mb-1.5 block text-sm font-medium text-slate-700'>
              <MultiLangText>{field.label}</MultiLangText>
              {field.required && <span className='text-rose-500 ml-1'>*</span>}
            </div>
            <div className='relative'>
              <Flatpickr
                value={fieldValue}
                onChange={([date]) => setValue(field.key, date, { shouldValidate: true })}
                options={{ dateFormat: 'Y-m-d', allowInput: true }}
                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-4
                  ${error ? 'border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'}
                `}
                placeholder={field.placeholder || 'Select date'}
              />
              <FiCalendar className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none' />
            </div>
            {renderErrorText(error)}
          </div>
        );

      case 'textarea':
        return <Textarea label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || ''} rows={4} error={error?.message} {...register(field.key)} />;

      case 'select':
        return <Select label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || 'Select an option'} options={(field.options || []).map(opt => ({ id: opt, label: opt }))} value={fieldValue} onChange={val => setValue(field.key, val, { shouldValidate: true })} required={!!field.required} error={error?.message} />;

      case 'radio':
        return <RadioGroup field={field} error={error} />;

      case 'checkbox':
        return (
          <div className='py-1'>
            <CheckBox label={<MultiLangText>{field.label}</MultiLangText>} initialChecked={!!fieldValue} onChange={checked => setValue(field.key, checked, { shouldValidate: true })} />
            {renderErrorText(error)}
          </div>
        );

      case 'checklist':
        return <ChecklistGroup field={field} error={error} />;

      case 'file':
        return (
          <div className='space-y-2'>
            <div className='block text-sm font-medium text-slate-700'>
              <MultiLangText>{field.label}</MultiLangText>
              {field.required && <span className='text-rose-500 ml-1'>*</span>}
            </div>
            <AttachFilesButton
              onChange={files => {
                if (files && files.length > 0) {
                  const theFile = files[0];
                  setValue(field.key, theFile?.url || theFile, { shouldValidate: true });
                  setFileNames(prev => ({
                    ...prev,
                    [field.key]: theFile?.name || theFile?.url || 'Uploaded file',
                  }));
                }
              }}
            />
            {fileNames[field.key] && (
              <div className='text-xs text-slate-600 flex items-center gap-2'>
                <FiUpload /> {fileNames[field.key]}
              </div>
            )}
            {renderErrorText(error)}
          </div>
        );

      case 'phone':
        return <Input label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || 'Example: 966512345678'} type='tel' error={error?.message} {...register(field.key)} />;

      default:
        return <Input label={<MultiLangText>{field.label}</MultiLangText>} placeholder={field.placeholder || ''} error={error?.message} {...register(field.key)} />;
    }
  };

  // --- Loading Skeleton ---
  const Skeleton = () => (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>
      {/* Sticky header */}
      <div className='sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-slate-200'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 py-4'>
          <div className='flex items-center justify-between gap-4 animate-pulse'>
            {/* Title */}
            <div className='h-6 sm:h-7 w-48 sm:w-60 bg-slate-200 rounded' />
            {/* Progress */}
            <div className='min-w-[160px] w-44'>
              <div className='flex items-center justify-between mb-1'>
                <div className='h-3 w-14 bg-slate-200 rounded' />
                <div className='h-3 w-10 bg-slate-200 rounded' />
              </div>
              <div className='h-2 w-full bg-slate-200 rounded-full overflow-hidden'>
                <div className='h-full w-1/3 bg-slate-300' />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-4xl mx-auto px-4 sm:px-6 py-8'>
        <div className='bg-white shadow-sm rounded-lg overflow-hidden border border-slate-200'>
          {/* Card header */}
          <div className='px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200'>
            <div className='flex items-center gap-2 text-sm animate-pulse'>
              <div className='h-6 w-28 rounded-full bg-slate-200' />
              <div className='h-4 w-40 sm:w-64 bg-slate-200 rounded' />
            </div>
          </div>

          {/* Card body */}
          <div className='p-6 space-y-10 animate-pulse'>
            {/* Contact */}
            <section className='space-y-4'>
              <div className='h-4 w-24 bg-slate-200 rounded' />
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <div className='h-4 w-16 bg-slate-200 rounded' />
                  <div className='h-[43px] w-full bg-slate-200 rounded-lg' />
                </div>
                <div className='space-y-2'>
                  <div className='h-4 w-16 bg-slate-200 rounded' />
                  <div className='h-[43px] w-full bg-slate-200 rounded-lg' />
                </div>
              </div>
            </section>

            {/* Additional Information – 2 per row with some full-width blocks */}
            <section className='space-y-4'>
              <div className='h-4 w-44 bg-slate-200 rounded' />
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* normal field */}
                <div className='space-y-2'>
                  <div className='h-4 w-24 bg-slate-200 rounded' />
                  <div className='h-[43px] w-full bg-slate-200 rounded-lg' />
                </div>
                {/* normal field */}
                <div className='space-y-2'>
                  <div className='h-4 w-28 bg-slate-200 rounded' />
                  <div className='h-[43px] w-full bg-slate-200 rounded-lg' />
                </div>
                {/* textarea (full width) */}
                <div className='md:col-span-2 space-y-2'>
                  <div className='h-4 w-20 bg-slate-200 rounded' />
                  <div className='h-28 w-full bg-slate-200 rounded-lg' />
                </div>
                {/* select */}
                <div className='space-y-2'>
                  <div className='h-4 w-24 bg-slate-200 rounded' />
                  <div className='h-[43px] w-full bg-slate-200 rounded-lg' />
                </div>
                {/* date */}
                <div className='space-y-2'>
                  <div className='h-4 w-16 bg-slate-200 rounded' />
                  <div className='h-[43px] w-full bg-slate-200 rounded-lg' />
                </div>
                {/* radio/checklist (full width) */}
                <div className='md:col-span-2 space-y-3'>
                  <div className='h-4 w-28 bg-slate-200 rounded' />
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    <div className='h-12 rounded-lg bg-slate-200' />
                    <div className='h-12 rounded-lg bg-slate-200' />
                  </div>
                </div>
                {/* file (full width) */}
                <div className='md:col-span-2 space-y-2'>
                  <div className='h-4 w-14 bg-slate-200 rounded' />
                  <div className='h-12 w-full bg-slate-200 rounded-lg' />
                  <div className='h-3 w-24 bg-slate-200 rounded' />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Fixed submit bar */}
      <div className='fixed bottom-4 left-0 right-0 px-4 sm:px-6'>
        <div className='max-w-4xl mx-auto'>
          <div className='rounded-lg bg-white/95 shadow-lg border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse'>
            <div className='h-4 w-48 bg-slate-200 rounded' />
            <div className='h-10 w-full sm:w-40 bg-slate-200 rounded-lg' />
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) return <Skeleton />;

  if (!form) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center px-4'>
        <div className='text-center'>
          <FiXCircle className='h-12 w-12 text-slate-300 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-slate-900 mb-2'>Form Not Found</h3>
          <p className='text-slate-600'>The form you’re looking for doesn’t exist.</p>
        </div>
      </div>
    );
  }

  // Decide if a field should span full width in the grid
  const isFullWidthField = type => [].includes(type);

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>
      {/* Top header */}
      <div className='sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-slate-200'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 py-4'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <MultiLangText className='text-xl sm:text-2xl font-bold text-slate-900'>{form.title}</MultiLangText>
            </div>
            {/* Progress */}
            <div className='min-w-[160px]'>
              <div className='flex items-center justify-between text-xs text-slate-600 mb-1'>
                <span>Progress</span>
                <span>{isNaN(progress) ? 0 : progress}%</span>
              </div>
              <div className='h-2 bg-slate-200 rounded-full overflow-hidden'>
                <motion.div initial={{ width: 0 }} animate={{ width: `${isNaN(progress) ? 0 : progress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} className='h-full bg-indigo-500' />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit(onSubmit)} className='max-w-4xl mx-auto px-4 sm:px-6 py-8'>
        <div className='bg-white shadow-sm rounded-lg overflow-hidden border border-slate-200'>
          {/* Card header */}
          <div className='px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200'>
            <div className='flex items-center gap-2 text-slate-700 text-sm'>
              <span className='inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100'>
                <FiSend /> Public Form
              </span>
              {form?.description && <MultiLangText className='text-slate-500 truncate'>{form.description}</MultiLangText>}
            </div>
          </div>

          {/* Card body */}
          <div className='p-6 space-y-10'>
            {/* Email & Phone (always required) */}
            <section aria-labelledby='contact-info' className='space-y-4'>
              <h2 id='contact-info' className='text-sm font-semibold text-slate-900'>
                Contact
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Input label='Email' type='email' placeholder='you@email.com' required error={errors?.email?.message} {...register('email')} />
                <Input label='Phone' type='tel' placeholder='966512345678' required error={errors?.phone?.message} {...register('phone')} />
              </div>
            </section>

            {/* Dynamic Fields (responsive grid, 2 per row on desktop) */}
            {(form.fields || []).length > 0 && (
              <section aria-labelledby='additional-info' className='space-y-4'>
                <h2 id='additional-info' className='text-sm font-semibold text-slate-900'>
                  Additional Information
                </h2>

                <motion.div layout className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {(form.fields || []).map(field => (
                    <motion.div key={field.id} layout transition={{ duration: 0.18 }} className={isFullWidthField(field.type) ? 'md:col-span-2' : ''}>
                      {renderFieldInput(field)}
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}
          </div>
        </div>

        {/* Submit actions */}
        <div className='h-20' />
        <div className='fixed bottom-4 left-0 right-0 px-4 sm:px-6'>
          <div className='max-w-4xl mx-auto'>
            <div className='rounded-lg bg-white/95 shadow-lg border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div className='text-xs sm:text-sm text-slate-600'>Review your info before submitting.</div>
              <Button type='submit' name={isSubmitting ? 'Submitting...' : 'Submit Form'} icon={<FiSend className='w-4 h-4' />} className='!w-full sm:!w-fit sm:min-w-[160px]' loading={isSubmitting} />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------- INPUT (polished + RHF-safe) ---------- */
const Input = forwardRef(function Input(
  {
    label,
    placeholder = '',
    name,
    type = 'text',
    value, // optional controlled value
    onChange, // RHF onChange(event) OR setter(value)
    onBlur,
    disabled = false,
    error,
    clearable = true,
    className = '',
    cnInput,
    ...rest
  },
  ref,
) {
  const innerRef = useRef(null);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(value ?? '');

  useEffect(() => {
    if (isControlled) setInternal(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useImperativeHandle(ref, () => innerRef.current);

  function handleChange(eOrValue) {
    const isEvent = eOrValue && typeof eOrValue === 'object' && 'target' in eOrValue;
    const next = isEvent ? eOrValue.target.value : eOrValue;

    if (!isControlled) setInternal(next);

    if (typeof onChange === 'function') {
      if (isEvent) {
        onChange(eOrValue); // pass through RHF event
      } else {
        const fieldName = name || innerRef.current?.name || '';
        onChange({ target: { name: fieldName, value: next } });
      }
    }
  }

  function clearInput(e) {
    e.stopPropagation();
    if (!isControlled) setInternal('');
    if (typeof onChange === 'function') {
      const fieldName = name || innerRef.current?.name || '';
      onChange({ target: { name: fieldName, value: '' } });
    }
    innerRef.current?.focus();
  }

  return (
    <div className={`w-full relative ${className}`}>
      {label && <label className='mb-1.5 block text-sm font-medium text-slate-700'>{label}</label>}

      <div className={['relative flex items-center', 'rounded-lg border bg-white', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text', error ? 'border-rose-500' : 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500', 'focus-within:ring-4 focus-within:ring-indigo-100', 'transition-colors'].join(' ')}>
        <input ref={innerRef} type={type} name={name} placeholder={placeholder} value={internal ?? ''} disabled={disabled} onChange={handleChange} onBlur={onBlur} className={`${cnInput || ''} h-[43px] w-full rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-gray-400`} {...rest} />

        {clearable && !!(internal ?? '') && !disabled && <X size={16} className='absolute right-3 opacity-60 hover:opacity-100 transition cursor-pointer' onClick={clearInput} />}
      </div>

      {error && <p className='mt-1.5 text-xs text-rose-600'>{error}</p>}
    </div>
  );
});

export function Select({
  options = [], // [{ id, label }]
  value = null, // selected id OR custom string
  onChange = () => {},
  placeholder = 'Select…',
  searchable = true,
  disabled = false,
  clearable = true,
  className = '',
  label, // can be <MultiLangText>…</MultiLangText>
  allowCustom = false,
  createHint = 'Write a new category…',

  // NEW
  required = false,
  error = '', // string | undefined
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [createMode, setCreateMode] = useState(false);
  const [createText, setCreateText] = useState('');

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const createInputRef = useRef(null);
  const [portalReady, setPortalReady] = useState(false);

  // Fixed-position coords for the portal menu
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = useMemo(() => options.find(o => String(o.id) === String(value)) || null, [options, value]);

  // What to show on the button
  const buttonLabel = useMemo(() => {
    if (selectedOption) return selectedOption.label;
    if (typeof value === 'string' && value.trim()) return value;
    return placeholder || 'Select…';
  }, [selectedOption, value, placeholder]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter(o => String(o.label).toLowerCase().includes(q));
  }, [options, query, searchable]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return options.some(o => String(o.label).toLowerCase() === q);
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

  // Prepare portal
  useEffect(() => setPortalReady(true), []);

  // Reposition on resize/scroll
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = e => {
      const t = e.target;
      if (buttonRef.current?.contains(t) || listRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, closeMenu]);

  // Focus the create input when opening create mode
  useEffect(() => {
    if (createMode) {
      setTimeout(() => createInputRef.current?.focus(), 0);
    }
  }, [createMode]);

  // Keyboard interactions
  const onKeyDown = e => {
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
      setActiveIndex(i => {
        const next = Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => {
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

  const scrollIntoView = index => {
    const list = listRef.current;
    if (!list) return;
    const offset = searchable ? 1 : 0;
    const item = list.children[index + offset];
    if (!item) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
  };

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
    const t = (text ?? '').trim();
    if (!t) return;
    onChange(t); // pass raw string as the new category
    closeMenu();
    buttonRef.current?.focus();
  };

  const errorState = Boolean(error);
  const buttonClasses = ['h-[43px] group relative w-full inline-flex items-center justify-between', 'rounded-lg border bg-white px-3.5 py-2.5 text-sm', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', 'transition-colors', errorState ? 'border-rose-500 focus-within:border-rose-500' : 'border-slate-300 hover:border-slate-400 focus:border-indigo-500', 'focus:outline-none focus:ring-4', errorState ? 'focus:ring-rose-100' : 'focus:ring-indigo-100'].join(' ');

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label className='mb-1.5 block text-sm font-medium text-slate-700'>
          <MultiLangText>{label.props.children}</MultiLangText>
          {required && <span className='text-rose-500 ml-1'>*</span>}
        </label>
      )}

      <button type='button' ref={buttonRef} onClick={() => (open ? closeMenu() : openMenu())} onKeyDown={onKeyDown} disabled={disabled} className={buttonClasses} aria-haspopup='listbox' aria-expanded={open} aria-invalid={errorState || undefined}>
        <MultiLangText className={`truncate text-left ${selectedOption || (typeof value === 'string' && value.trim()) ? 'text-slate-900' : 'text-gray-500'}`}>{buttonLabel}</MultiLangText>

        <span className='ml-3 flex items-center gap-1'>
          {clearable && (selectedOption || (typeof value === 'string' && value)) && !disabled && <X className='h-4 w-4 opacity-60 hover:opacity-100 transition' onClick={clear} />}
          <ChevronDown className='h-4 w-4 text-slate-600' />
        </span>
      </button>

      {/* error helper text */}
      {errorState && <p className='mt-1.5 text-xs text-rose-600'>{error}</p>}

      {portalReady &&
        open &&
        createPortal(
          <div role='listbox' aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined} className='z-[99999999] fixed mt-0' style={{ top: coords.top, left: coords.left, width: coords.width }}>
            <div ref={listRef} className='max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5' onKeyDown={onKeyDown}>
              {/* Search row */}
              {searchable && !createMode && (
                <div className='p-2 border-b border-slate-100 sticky top-0 bg-white'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                    <input
                      className='w-full h-9 pl-10 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white'
                      placeholder='Search…'
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

              {/* Creation form */}
              {allowCustom && createMode && (
                <div className='p-2 border-b border-slate-100 sticky top-0 bg-white'>
                  <div className='flex gap-2'>
                    <input
                      ref={createInputRef}
                      className='flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                      placeholder={createHint}
                      value={createText}
                      onChange={e => setCreateText(e.target.value)}
                      onKeyDown={e => {
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
                    <button type='button' onClick={() => createFromText(createText)} className='inline-flex items-center gap-1 rounded-lg px-3 text-sm border border-slate-300 hover:border-slate-400 h-9'>
                      <Save className='w-4 h-4' /> Save
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setCreateMode(false);
                        setCreateText('');
                      }}
                      className='inline-flex items-center gap-1 rounded-lg px-3 text-sm border border-slate-300 hover:border-slate-400 h-9'>
                      <CircleX className='w-4 h-4' /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Options */}
              {!createMode && (
                <>
                  <ul className='py-1'>
                    {filtered.length === 0 && <li className='px-3 py-2 text-sm text-slate-400'>No results</li>}
                    {filtered.map((item, idx) => {
                      const isSelected = selectedOption?.id === item.id;
                      const isActive = idx === activeIndex;
                      return (
                        <li id={`opt-${idx}`} key={item.id} role='option' aria-selected={isSelected} className={['mx-1 my-0.5 rounded-lg px-3 py-2 text-sm flex items-center justify-between select-none cursor-pointer', isActive ? 'bg-indigo-50' : 'bg-transparent', isSelected ? 'text-indigo-700' : 'text-slate-700', 'hover:bg-indigo-50'].join(' ')} onMouseEnter={() => setActiveIndex(idx)} onMouseDown={e => e.preventDefault()} onClick={() => pick(item)}>
                          <MultiLangText className='truncate'>{item.label}</MultiLangText>
                          {isSelected && <Check className='h-4 w-4 text-indigo-600' />}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Quick create from query */}
                  {allowCustom && query.trim() && !hasExactMatch && (
                    <div className='p-2 border-t border-slate-100 sticky bottom-0 bg-white'>
                      <button type='button' onClick={() => createFromText(query)} className='w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-sm border border-dashed border-slate-300 hover:border-slate-400'>
                        <Plus className='w-4 h-4' />
                        Create “{query.trim()}”
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Footer: open create mode */}
              {!createMode && allowCustom && (
                <div className='p-2 border-t border-slate-100 sticky bottom-0 bg-white'>
                  <button
                    type='button'
                    onClick={() => {
                      setCreateMode(true);
                      setCreateText('');
                    }}
                    className='w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 text-sm border border-slate-300 hover:border-slate-400'>
                    <Plus className='w-4 h-4' />
                    {createHint}
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
