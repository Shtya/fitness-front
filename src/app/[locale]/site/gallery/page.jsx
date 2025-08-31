// ===================== components/site/gallery/MediaCard.jsx =====================

'use client';

import { Play, X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';
import { Container, Section, Button, Card, Input, Select, Badge } from '@/components/site/UI';
  
export const MEDIA = [
  {
    id: 'g1',
    type: 'photo',
    title: 'Strength 101 Class',
    date: '2025-07-20',
    tags: ['Class', 'Strength'],
    src: 'https://placehold.co/600x400/png?text=Strength+101',
    ratio: '16/9',
  },
  {
    id: 'g2',
    type: 'photo',
    title: 'Mobility Flow',
    date: '2025-06-28',
    tags: ['Mobility', 'Yoga'],
    src: 'https://picsum.photos/800/600?random=1', // Lorem Picsum random
    ratio: '4/3',
  },
  {
    id: 'g3',
    type: 'video',
    title: 'Member PR — Deadlift 180kg',
    date: '2025-05-15',
    tags: ['PR', 'Strength'],
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // YouTube embed
    thumb: 'https://dummyimage.com/600x400/000/fff.png&text=Deadlift+PR',
    ratio: '16/9',
  },
  {
    id: 'g4',
    type: 'photo',
    title: 'Community Fun Run',
    date: '2025-05-01',
    tags: ['Community', 'Outdoor'],
    src: 'https://placehold.co/800x450/jpg?text=Fun+Run',
    ratio: '16/9',
  },
  {
    id: 'g5',
    type: 'video',
    title: 'Kettlebell Workshop Recap',
    date: '2025-04-10',
    tags: ['Workshop'],
    src: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4', // Public demo MP4
    thumb: 'https://placehold.co/600x400/png?text=Kettlebell+Workshop',
    ratio: '16/9',
  },
  {
    id: 'g6',
    type: 'photo',
    title: 'Post-Class Vibes',
    date: '2025-03-12',
    tags: ['Community'],
    src: 'https://picsum.photos/500/500?random=2',
    ratio: '1/1',
  },
  {
    id: 'g7',
    type: 'photo',
    title: 'Yoga Session Placeholder',
    date: '2025-02-20',
    tags: ['Yoga', 'Flexibility'],
    src: 'https://dummyimage.com/700x500/228B22/fff&text=Yoga+Session',
    ratio: '4/3',
  },
  {
    id: 'g8',
    type: 'video',
    title: 'Placeholder Training Video',
    date: '2025-01-15',
    tags: ['Training'],
    videoUrl: 'https://www.videvo.net/videvo_files/converted/2017_08/preview/170810_A_001.mp427920.webm', // Free stock demo video
    thumb: 'https://placehold.co/600x400/png?text=Training+Video',
    ratio: '16/9',
  },
];


export function allTags() {
  return Array.from(new Set(MEDIA.flatMap(m => m.tags))).sort();
}

export function MediaCard({ item, onOpen }) {
  const cls = ratioClass(item.ratio);
  const cover = item.type === 'video' ? item.thumb || item.src : item.src;
  return (
    <Card className='overflow-hidden cursor-pointer group' onClick={() => onOpen?.()}>
      <div className={`${cls} w-full bg-slate-200 relative`} style={{ backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {item.type === 'video' && (
          <div className='absolute inset-0 grid place-items-center'>
            <div className='flex items-center gap-2 rounded-full bg-black/50 text-white px-3 py-1 text-xs opacity-90'>
              <Play className='w-3.5 h-3.5' /> Video
            </div>
          </div>
        )}
        <div className='absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent text-white'>
          <div className='text-sm font-medium line-clamp-1'>{item.title}</div>
          <div className='text-[11px] opacity-90'>{new Date(item.date).toLocaleDateString()}</div>
        </div>
      </div>
      <div className='p-3'>
        <div className='flex flex-wrap gap-1.5'>
          {item.tags?.slice(0, 3).map(t => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ratioClass(r) {
  if (r === '1/1') return 'aspect-square';
  if (r === '4/3') return 'aspect-[4/3]';
  return 'aspect-video'; // 16/9 default
}

export function Lightbox({ items, index, onClose, onPrev, onNext }) {
  const item = items?.[index];
  if (!items || index == null || !item) return null;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const isYT = isYouTube(item.videoUrl);

  function download() {
    if (item.type !== 'photo') return;
    const a = document.createElement('a');
    a.href = item.src;
    a.download = (item.title || 'image').replace(/\s+/g, '-').toLowerCase() + '.jpg';
    a.click();
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 grid place-items-center' onClick={onClose}>
      <div className='relative w-full max-w-5xl' onClick={e => e.stopPropagation()}>
        {/* Media */}
        <div className='w-full rounded-2xl overflow-hidden bg-black'>
          {item.type === 'photo' && <img src={item.src} alt={item.title} className='w-full h-auto object-contain max-h-[72vh] mx-auto' />}
          {item.type === 'video' && item.videoUrl && isYT && (
            <div className='aspect-video w-full'>
              <iframe className='w-full h-full' src={`${item.videoUrl}?rel=0`} title={item.title} allowFullScreen />
            </div>
          )}
          {item.type === 'video' && !isYT && <video className='w-full h-auto max-h-[72vh]' controls src={item.src} />}
        </div>

        {/* Top bar */}
        <div className='absolute -top-12 left-0 right-0 mx-auto flex items-center justify-between text-white'>
          <div className='text-sm opacity-90'>{item.title}</div>
          <div className='flex items-center gap-2'>
            {item.type === 'photo' && (
              <Button size='sm' variant='ghost' onClick={download}>
                <Download className='w-4 h-4' />
                <span className='ml-1'>Download</span>
              </Button>
            )}
            {item.type === 'video' && item.videoUrl && isYT && (
              <a href={item.videoUrl.replace('/embed/', '/watch?v=')} target='_blank' className='inline-flex items-center text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20'>
                <ExternalLink className='w-4 h-4' />
                <span className='ml-1'>Open</span>
              </a>
            )}
            <Button size='sm' variant='ghost' onClick={onClose}>
              <X className='w-4 h-4' /> <span className='ml-1'>Close</span>
            </Button>
          </div>
        </div>

        {/* Nav */}
        <button className='absolute left-0 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2' onClick={onPrev} aria-label='Prev'>
          <ChevronLeft className='w-7 h-7' />
        </button>
        <button className='absolute right-0 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2' onClick={onNext} aria-label='Next'>
          <ChevronRight className='w-7 h-7' />
        </button>
      </div>
    </div>
  );
}

function isYouTube(url) {
  return typeof url === 'string' && /youtube|youtu\.be/.test(url);
}

export default function GalleryPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('All');
  const [tag, setTag] = useState('All');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const tags = useMemo(() => ['All', ...allTags()], []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MEDIA.filter(m => (type === 'All' || m.type === type.toLowerCase()) && (tag === 'All' || (m.tags || []).includes(tag)) && (!s || [m.title, ...(m.tags || [])].join(' ').toLowerCase().includes(s))).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [q, type, tag]);

  function openAt(i) {
    setIndex(i);
    setOpen(true);
  }
  function onPrev() {
    setIndex(i => (i - 1 + filtered.length) % filtered.length);
  }
  function onNext() {
    setIndex(i => (i + 1) % filtered.length);
  }

  return (
    <Section>
      <Container>
        {/* Header */}
        <div className='text-center max-w-2xl mx-auto'>
          <Badge>Community</Badge>
          <h1 className='mt-3 text-3xl sm:text-4xl font-extrabold'>Gallery</h1>
          <p className='mt-2 text-slate-600'>Photos & videos from classes, events, and member milestones.</p>
        </div>

        {/* Filters */}
        <Card className='mt-6 p-4'>
          <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
            <Input placeholder='Search media…' value={q} onChange={e => setQ(e.target.value)} />
            <Select value={type} onChange={e => setType(e.target.value)}>
              {['All', 'Photos', 'Videos'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Select value={tag} onChange={e => setTag(e.target.value)}>
              {tags.map(t => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Button
              variant='ghost'
              onClick={() => {
                setQ('');
                setType('All');
                setTag('All');
              }}>
              Reset
            </Button>
          </div>
        </Card>

        {/* Grid */}
        {filtered.length ? (
          <div className='mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'>
            {filtered.map((item, i) => (
              <MediaCard key={item.id} item={item} onOpen={() => openAt(i)} />
            ))}
          </div>
        ) : (
          <Card className='mt-6 p-8 text-center'>
            <div className='text-slate-700 font-medium'>No media match your filters.</div>
            <div className='text-slate-500 text-sm'>Try another tag or keyword.</div>
          </Card>
        )}

        <Lightbox items={filtered} index={open ? index : null} onClose={() => setOpen(false)} onPrev={onPrev} onNext={onNext} />
      </Container>
    </Section>
  );
}
