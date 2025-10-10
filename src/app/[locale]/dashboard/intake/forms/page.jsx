'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiEye, FiCopy, FiChevronUp, FiChevronDown, FiSearch, FiShare2 } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa6';

// Your atoms
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Textarea from '@/components/atoms/Textarea';
import Select from '@/components/atoms/Select';
import CheckBox from '@/components/atoms/CheckBox';
import InputList from '@/components/atoms/InputList';

// Your modal
import { Modal } from '@/components/dashboard/ui/UI';
import { GripVertical } from 'lucide-react';
import MultiLangText from '@/components/atoms/MultiLangText';

const FIELD_TYPE_OPTIONS = [
  { id: 'text', label: 'Text' },
  { id: 'email', label: 'Email' },
  { id: 'number', label: 'Number' },
  { id: 'phone', label: 'Phone' },
  { id: 'date', label: 'Date' },
  { id: 'textarea', label: 'Text Area' },
  { id: 'select', label: 'Select' },
  { id: 'radio', label: 'Radio' },
  { id: 'checkbox', label: 'Checkbox' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'file', label: 'File' },
];

export default function FormsManagementPage() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');

  const [selectedForm, setSelectedForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);

  // Field modal
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState(null);

  // Form states (for modal)
  const [formTitle, setFormTitle] = useState('');
  const [formFields, setFormFields] = useState([]); // can contain both existing + new (no id) fields

  // Field states (for field modal)
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState([]);

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered(forms);
    } else {
      setFiltered(forms.filter(f => f.title?.toLowerCase().includes(q)));
    }
  }, [query, forms]);

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/forms'); // returns { data, total, ... } from your backend
      const list = res?.data?.data || res?.data || [];
      setForms(list);
      setFiltered(list);
      if (list.length && !selectedForm) {
        setSelectedForm(list[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFormState = () => {
    setFormTitle('');
    setFormFields([]);
    setSelectedForm(null);
  };

  const openCreateFormModal = () => {
    resetFormState();
    setShowFormModal(true);
  };

  const openEditFormModal = form => {
    setSelectedForm(form);
    setFormTitle(form?.title || '');
    const normalized = (form?.fields || []).slice().sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
    setFormFields(normalized);
    setShowFormModal(true);
  };

  const getShareableLink = formId => {
    return `${window.location.origin}/form/${formId}/submit`;
  };

  const copyLink = id => {
    const link = getShareableLink(id);
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  // ----- CRUD -----

  const createForm = async () => {
    try {
      if (!formTitle.trim()) {
        toast.error('Form title is required');
        return;
      }
      // Only new fields are possible in create
      const payload = {
        title: formTitle.trim(),
        fields: (formFields || []).map((f, idx) => ({
          label: f.label,
          key: f.key,
          placeholder: f.placeholder || '',
          type: f.type,
          required: !!f.required,
          options: f.options || [],
          order: idx,
        })),
      };
      await api.post('/forms', payload);
      toast.success('Form created successfully');
      setShowFormModal(false);
      resetFormState();
      fetchForms();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create form');
    }
  };

  // Update with proper split:
  const updateForm = async () => {
    if (!selectedForm?.id) return;
    try {
      if (!formTitle.trim()) {
        toast.error('Form title is required');
        return;
      }

      // ensure contiguous order in UI first
      const ordered = formFields.map((f, idx) => ({ ...f, order: idx }));
      setFormFields(ordered);

      const existing = ordered.filter(f => !!f.id);
      const newlyAdded = ordered.filter(f => !f.id);

      // 1) update title + existing fields data (backend requires id for each field here)
      if (existing.length) {
        const patchBody = {
          id: selectedForm.id,
          title: formTitle.trim(),
          fields: existing.map(f => ({
            id: f.id,
            label: f.label,
            key: f.key,
            placeholder: f.placeholder || '',
            type: f.type,
            required: !!f.required,
            options: f.options || [],
            order: f.order,
          })),
        };
        await api.patch('/forms', patchBody);
      } else {
        // if there were no existing fields, still update the title
        await api.patch('/forms', {
          id: selectedForm.id,
          title: formTitle.trim(),
          fields: [], // backend demands array; empty means no field updates
        });
      }

      // 2) add newly added fields
      if (newlyAdded.length) {
        await api.post(`/forms/${selectedForm.id}/fields`, {
          fields: newlyAdded.map(f => ({
            label: f.label,
            key: f.key,
            placeholder: f.placeholder || '',
            type: f.type,
            required: !!f.required,
            options: f.options || [],
            order: f.order,
          })),
        });
      }

      // 3) make sure orders for existing are synced (nice to call explicitly)
      if (existing.length) {
        await api.patch('/forms/re-order', {
          fields: existing.map(f => ({ id: f.id, order: f.order })),
        });
      }

      toast.success('Form updated successfully');
      setShowFormModal(false);
      resetFormState();
      fetchForms();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to update form';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteForm = async formId => {
    try {
      setIsDeleting(true);
      await api.delete(`/forms/${formId}`);
      toast.success('Form deleted successfully');
      if (selectedForm?.id === formId) setSelectedForm(null);
      await fetchForms();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete form');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  // ----- Fields (UI state only; submit handled in create/update) -----

  const resetFieldModal = () => {
    setFieldLabel('');
    setFieldKey('');
    setFieldType('text');
    setFieldPlaceholder('');
    setFieldRequired(false);
    setFieldOptions([]);
    setEditingFieldIndex(null);
  };

  const openFieldModal = (index = null) => {
    if (index !== null) {
      setEditingFieldIndex(index);
      const f = formFields[index];
      setFieldLabel(f.label || '');
      setFieldKey(f.key || '');
      setFieldType(f.type || 'text');
      setFieldPlaceholder(f.placeholder || '');
      setFieldRequired(!!f.required);
      setFieldOptions(Array.isArray(f.options) ? f.options : []);
    } else {
      resetFieldModal();
    }
    setShowFieldModal(true);
  };

  const saveFieldFromModal = () => {
    if (!fieldLabel.trim() || !fieldKey.trim()) {
      toast.error('Label and key are required');
      return;
    }

    const next = {
      // keep id if we’re editing an existing field (so update works)
      ...(editingFieldIndex !== null && formFields[editingFieldIndex]?.id ? { id: formFields[editingFieldIndex].id } : {}),
      label: fieldLabel.trim(),
      key: fieldKey.trim(),
      type: fieldType,
      placeholder: fieldPlaceholder || '',
      required: !!fieldRequired,
      options: fieldType === 'select' || fieldType === 'radio' || fieldType === 'checklist' ? fieldOptions || [] : [],
      order: editingFieldIndex !== null ? formFields[editingFieldIndex]?.order ?? editingFieldIndex : formFields.length,
    };

    if (editingFieldIndex !== null) {
      const clone = formFields.slice();
      clone[editingFieldIndex] = next;
      setFormFields(clone.map((f, idx) => ({ ...f, order: idx })));
    } else {
      setFormFields([...formFields, next].map((f, idx) => ({ ...f, order: idx })));
    }

    setShowFieldModal(false);
    resetFieldModal();
  };

  const removeField = index => {
    const clone = formFields.filter((_, i) => i !== index);
    // reindex order
    setFormFields(clone.map((f, idx) => ({ ...f, order: idx })));
  };

  const moveField = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= formFields.length) return;
    const clone = formFields.slice();
    const tmp = clone[index];
    clone[index] = clone[newIndex];
    clone[newIndex] = tmp;
    // reset orders
    const ordered = clone.map((f, idx) => ({ ...f, order: idx }));
    setFormFields(ordered);
  };

  const isEditing = !!selectedForm;

  const Pill = ({ children, tone = 'slate' }) => <span className={tone === 'amber' ? 'inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs text-amber-800' : 'inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700'}>{children}</span>;

  const FieldRow = ({ field, index, canMoveUp = true, canMoveDown = true }) => {
    return (
      <div className='group flex items-start justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition'>
        {/* Left: label + meta */}
        <div className='min-w-0 pr-3'>
          <div className='flex items-center gap-2 flex-wrap'>
            <MultiLangText className='font-medium text-slate-900 break-all'>{field.label}</MultiLangText>
            <Pill>{field.type}</Pill>
            {field.required && <Pill tone='amber'>required</Pill>}
          </div>

          <div className='mt-1 text-xs text-slate-500 break-all'>key: {field.key}</div>
          {field.placeholder && <MultiLangText className='mt-1 text-xs text-slate-500 break-all'>placeholder: {field.placeholder}</MultiLangText>}
          {(field.type === 'select' || field.type === 'radio' || field.type === 'checklist') && Array.isArray(field.options) && field.options.length > 0 && <MultiLangText className='mt-1 text-xs text-slate-500 break-words'>options: {field.options.join(', ')}</MultiLangText>}
        </div>

        {/* Right: controls (hover reveal on large screens, always visible on touch) */}
        <div className='flex items-center gap-1  transition-opacity'>
           
          {/* Move up */}
          <button type='button' title='Move up' aria-label='Move up' disabled={!canMoveUp} className='inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed' onClick={() => moveField(index, -1)}>
            <FiChevronUp className='w-4 h-4' />
          </button>

          {/* Move down */}
          <button type='button' title='Move down' aria-label='Move down' disabled={!canMoveDown} className='inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed' onClick={() => moveField(index, +1)}>
            <FiChevronDown className='w-4 h-4' />
          </button>

          {/* Edit */}
          <button type='button' title='Edit field' aria-label='Edit field' className='inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400' onClick={() => openFieldModal(index)}>
            <FiEdit2 className='w-4 h-4' />
          </button>

          {/* Remove */}
          <button type='button' title='Remove field' aria-label='Remove field' className='inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400' onClick={() => removeField(index)}>
            <FiTrash2 className='w-4 h-4' />
          </button>
        </div>
      </div>
    );
  };

  // if (isLoading) {
  //   return (
  //     <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
  //       <FaSpinner className='animate-spin h-8 w-8 text-indigo-600' />
  //     </div>
  //   );
  // }

  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='container !px-0 '>
        {/* Header */}

        <div className=' mb-8 rounded-lg overflow-hidden border border-indigo-200 shadow-sm'>
          <div className='relative flex items-center justify-between  p-6 md:p-10 bg-gradient-to-r from-indigo-600 to-violet-600 text-white'>
            <div className='absolute inset-0 opacity-20 bg-[radial-gradient(600px_200px_at_20%_-20%,white,transparent)]' />
            <div className='relative z-10'>
              <h1 className='text-2xl md:text-3xl font-bold'>Forms</h1>
              <p className='text-white/90 mt-1'>Create, edit, and share custom forms.</p>
            </div>
            <div className='flex gap-2 relative'>
              <div className='relative'>
                <Input label='' placeholder='Search forms…' value={query} onChange={setQuery} className='pl-9 min-w-[240px]' />
              </div>
              <Button name='New form' color='violet' icon={<FiPlus className='w-4 h-4' />} className='!w-fit ' onClick={openCreateFormModal} />
            </div>
          </div>
 
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          {/* Left: list */}
          <aside className='lg:col-span-4'>
            <div className='rounded-lg border border-slate-200 bg-white'>
              {filtered.length === 0 ? (
                <div className='p-8 text-center'>
                  <FiFileText className='h-10 w-10 text-slate-300 mx-auto mb-3' />
                  <div className='font-medium text-slate-900 mb-1'>No forms yet</div>
                  <div className='text-slate-600 text-sm mb-4'>Create your first form to get started.</div>
                  <Button name='Create form' icon={<FiPlus className='w-4 h-4' />} className='!w-fit' onClick={openCreateFormModal} />
                </div>
              ) : (
                <ul className=' divide-y divide-slate-100'>
                  {filtered.map(f => {
                    const isActive = selectedForm?.id === f.id;
                    return (
                      <li key={f.id} className={`p-4 cursor-pointer transition rounded-lg border ${isActive ? 'bg-indigo-50/70 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`} onClick={() => setSelectedForm(f)}>
                        <div className='flex items-center gap-3'>
                          {/* Icon on left */}
                          <div className='p-2 bg-indigo-100 rounded-lg shrink-0'>
                            <FiFileText className='h-5 w-5 text-indigo-600' />
                          </div>

                          {/* Content */}
                          <div className='min-w-0 flex-1'>
                            <div className='flex items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <MultiLangText className='font-semibold text-slate-900 truncate' as='h2'>{f.title}</MultiLangText>
                                <p className='text-sm text-slate-600'>
                                  {f.fields?.length ?? 0} field{(f.fields?.length ?? 0) === 1 ? '' : 's'}
                                </p>
                              </div>

                              {/* Custom action buttons */}
                              <div className='flex gap-2'>
                                <button
                                  type='button'
                                  title='Copy share link'
                                  aria-label='Copy share link'
                                  className='inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition focus:outline-none focus:ring-2 focus:ring-emerald-400'
                                  onClick={e => {
                                    e.stopPropagation();
                                    copyLink(f.id);
                                  }}>
                                  <FiShare2 className='w-4 h-4' />
                                </button>

                                <button
                                  className='flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-400'
                                  onClick={e => {
                                    e.stopPropagation();
                                    openEditFormModal(f);
                                  }}>
                                  <FiEdit2 className='w-4 h-4' />
                                </button>

                                <button
                                  className='flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition focus:outline-none focus:ring-2 focus:ring-red-400'
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDeletingId(f.id);
                                    setShowDeleteModal(true);
                                  }}>
                                  <FiTrash2 className='w-4 h-4' />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Right: details */}
          <section className='lg:col-span-8'>
            {!selectedForm ? (
              <div className='rounded-lg border border-dashed border-slate-300 p-10 text-center bg-white'>
                <div className='text-slate-600'>Select a form on the left to see details.</div>
              </div>
            ) : (
              <div className='rounded-lg border border-slate-200 bg-white p-6 shadow-sm'>
                {/* Header */}
                <div className='flex items-center justify-between gap-3 flex-wrap'>
                  <div className='flex items-center w-full justify-between flex-wrap gap-3 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <div className='p-2 bg-indigo-100 rounded-lg shrink-0'>
                        <FiFileText className='h-6 w-6 text-indigo-600' />
                      </div>
                      <MultiLangText className='text-xl font-semibold text-slate-900 truncate'>{selectedForm.title}</MultiLangText>
                    </div>
                    <div className='text-xs font-[600] text-slate-600 '>Created {selectedForm.created_at ? new Date(selectedForm.created_at).toLocaleString() : ''}</div>
                  </div>
                </div>

                {/* Fields */}
                <div className='mt-6'>
                  <h3 className='font-medium text-slate-900 mb-3'>Fields</h3>

                  {selectedForm.fields?.length ? (
                    <div className='grid gap-3 overflow-y-auto max-h-[400px] px-6  w-[calc(100%+44px)] ltr:ml-[-22px] rtl:mr-[-22px] '>
                      {(selectedForm.fields || [])
                        .slice()
                        .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
                        .map(field => (
                          <div key={field.id} className='rounded-lg border border-slate-200 bg-slate-50 p-3'>
                            <div className='flex items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <div className='flex items-center gap-2 flex-wrap'>
                                  <MultiLangText className='font-medium text-slate-900 break-all'>{field.label}</MultiLangText>

                                  {/* Pills instead of <Badge /> */}
                                  <span className='inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700'>{field.type}</span>

                                  {field.required && <span className='inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 border border-amber-200'>required</span>}
                                </div>

                                <div className='mt-1 text-xs text-slate-500 break-all'>key: {field.key}</div>
                              </div>

                              <div className='text-xs text-slate-500 shrink-0'>order: {field.order ?? 0}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className='rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-600'>No fields yet.</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeletingId(null);
          }
        }}
        title='Delete form?'
        maxW='max-w-md'>
        <div className='space-y-4'>
          <p className='text-slate-700'>This action cannot be undone. The form and all its submissions will be permanently removed.</p>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              name='Cancel'
              className='!w-fit'
              onClick={() => {
                if (!isDeleting) {
                  setShowDeleteModal(false);
                  setDeletingId(null);
                }
              }}
            />
            <Button name={isDeleting ? 'Deleting…' : 'Delete'} className='!w-fit' color='danger' onClick={() => deletingId && deleteForm(deletingId)} disabled={isDeleting} />
          </div>
        </div>
      </Modal>

      {/* Create/Edit Form Modal */}
      <Modal open={showFormModal} onClose={() => setShowFormModal(false)} title={isEditing ? 'Edit Form' : 'Create New Form'} maxW='max-w-3xl'>
        <form
          className='space-y-6'
          onSubmit={e => {
            e.preventDefault();
            (isEditing ? updateForm : createForm)();
          }}>
          <Input label='Form Title' placeholder='Enter form title' value={formTitle} onChange={setFormTitle} />

          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-medium text-slate-900'>Form Fields</h3>

              {/* Custom Add Field button */}
              <button type='button' className='inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-400' onClick={() => openFieldModal(null)}>
                <FiPlus className='w-4 h-4' />
                <span className='text-sm font-medium'>Add field</span>
              </button>
            </div>

            {formFields.length ? (
              <div className='grid gap-3'>
                {formFields.map((f, idx) => (
                  <FieldRow key={(f.id || f.key || idx) + '-row'} field={f} index={idx} />
                ))}
              </div>
            ) : (
              <div className='rounded-lg bg-white border border-dashed border-slate-300 p-6 text-center text-slate-600'>No fields added yet.</div>
            )}
          </div>

          {/* Footer actions (custom) */}
          <div className='flex justify-end gap-2 pt-2'>
            {/* Cancel button */}
            <button type='button' onClick={() => setShowFormModal(false)} className='inline-flex items-center justify-center h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-300'>
              Cancel
            </button>

            {/* Submit button */}
            <button type='submit' className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-white font-medium text-sm transition focus:outline-none focus:ring-2 ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400'}`}>
              {isEditing ? <FiEdit2 className='w-4 h-4' /> : <FiPlus className='w-4 h-4' />}
              <span>{isEditing ? 'Save changes' : 'Create form'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Field Modal */}
      <Modal open={showFieldModal} onClose={() => setShowFieldModal(false)} title={editingFieldIndex !== null ? 'Edit Field' : 'Add Field'} maxW='max-w-2xl'>
        <div className='space-y-4'>
          <Input label='Field Label' placeholder='Enter field label' value={fieldLabel} onChange={setFieldLabel} />

          <Input label='Field Key' placeholder='Enter field key (unique)' value={fieldKey} onChange={setFieldKey} />

          <Select label='Field Type' value={fieldType} onChange={setFieldType} options={FIELD_TYPE_OPTIONS} />

          <Input label='Placeholder' placeholder='Enter placeholder text' value={fieldPlaceholder} onChange={setFieldPlaceholder} />

          <CheckBox label='Required Field' initialChecked={fieldRequired} onChange={setFieldRequired} />

          {(fieldType === 'select' || fieldType === 'radio' || fieldType === 'checklist') && <InputList label='Options' value={fieldOptions} onChange={setFieldOptions} placeholder='Add option and press Enter' />}

          <div className='flex justify-end gap-2 pt-2'>
            {/* Cancel button */}
            <button type='button' onClick={() => setShowFieldModal(false)} className='inline-flex items-center justify-center h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-300'>
              Cancel
            </button>

            {/* Add / Update button */}
            <button type='button' onClick={saveFieldFromModal} className='inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-400'>
              <FiPlus className='w-4 h-4' />
              <span className='text-sm font-medium'>{editingFieldIndex !== null ? 'Update field' : 'Add field'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
