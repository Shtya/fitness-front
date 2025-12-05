'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import api from '@/utils/axios';

function FeedbackWidget({ collapsed }) {
  const t = useTranslations('feedback'); // namespace: feedback

  const [open, setOpen] = useState(false);
  const [type, setType] = useState('enhancement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!title.trim() || !description.trim()) {
      setError(t('errorRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.post('/feedback', {
        type,
        title: title.trim(),
        description: description.trim(),
        email: email.trim() || null,
      });

      if (res.data.success) {
        setMessage(t('success'));
        setTitle('');
        setDescription('');
        setEmail('');
        setType('enhancement');

        setTimeout(() => {
          setOpen(false);
          setMessage(null);
        }, 1200);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || t('genericError');
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* الزر العائم */}
      <div className='w-full  ' onClick={() => setOpen(!open)}>
        <button className={collapsed ? `mx-auto flex items-center justify-center w-full h-12 rounded-full bg-indigo-600 text-white shadow-sm hover:shadow-md hover:bg-indigo-700 active:scale-95 transition-all duration-200` : `flex items-center gap-3 bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium shadow-sm hover:shadow-md hover:bg-indigo-700 active:scale-95 transition-all duration-200 w-full`} aria-label={t('floatingButtonAria')}>
          <div className='flex items-center justify-center w-5 h-5'>
            <MessageSquarePlus className='w-5 h-5' strokeWidth={2.2} />
          </div>

          {/* النص يظهر فقط إذا collapsed = false */}
          {!collapsed && <span className='text-sm font-medium tracking-wide'>{t('panelTitle')}</span>}
        </button>
      </div>

      {/* <div className='fixed bottom-6 right-6 z-50'>
        <Button size='icon' aria-label={t('floatingButtonAria')} onClick={() => setOpen(true)} className='rounded-full h-14 w-14 shadow-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white'>
          <MessageSquarePlus className='h-6 w-6' />
        </Button>
      </div> */}

      {/* الـ Overlay و الـ Panel */}
      {open && (
        <div className='fixed inset-0 z-40 flex items-center justify-center sm:items-center sm:justify-center'>
          <div className='absolute inset-0 bg-black/40' onClick={() => setOpen(false)} />

          <div
            className='  relative z-50 w-full max-w-md mx-4 mb-24 sm:mb-8 rounded-2xl border bg-background shadow-2xl p-4 sm:p-6
                       animate-[slide-up_0.2s_ease-out]'
            onClick={e => e.stopPropagation()}>
            <div className='flex items-start justify-between gap-3 mb-4'>
              <div>
                <h2 className='text-lg font-semibold'>{t('panelTitle')}</h2>
                <p className='text-xs text-muted-foreground mt-1'>{t('panelDescription')}</p>
              </div>
              <Button variant='ghost' size='icon' className='h-8 w-8 rounded-full' onClick={() => setOpen(false)} aria-label={t('close')}>
                <X className='h-4 w-4' />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* النوع */}
              <div className='grid gap-2'>
                <Label htmlFor='type'>{t('typeLabel')}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id='type'>
                    <SelectValue placeholder={t('typePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='enhancement'>{t('typeEnhancement')}</SelectItem>
                    <SelectItem value='issue'>{t('typeIssue')}</SelectItem>
                    <SelectItem value='other'>{t('typeOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* العنوان */}
              <div className='grid gap-2'>
                <Label htmlFor='title'>
                  {t('titleLabel')} <span className='text-red-500'>*</span>
                </Label>
                <Input id='title' placeholder={t('titlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              {/* التفاصيل */}
              <div className='grid gap-2'>
                <Label htmlFor='description'>
                  {t('detailsLabel')} <span className='text-red-500'>*</span>
                </Label>
                <Textarea id='description' rows={5} placeholder={t('detailsPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* البريد */}
              <div className='grid gap-2'>
                <Label htmlFor='email'>
                  {t('emailLabel')} <span className='text-xs text-muted-foreground'>({t('emailOptional')})</span>
                </Label>
                <Input id='email' type='email' placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              {error && <p className='text-sm text-red-500'>{error}</p>}
              {message && <p className='text-sm text-emerald-600'>{message}</p>}

              <div className='flex justify-end pt-1'>
                <Button type='submit' disabled={isSubmitting} className='w-full sm:w-auto bg-[#6366f1] hover:bg-[#4f46e5] text-white'>
                  {isSubmitting ? t('submitting') : t('submit')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
