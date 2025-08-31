"use client";

import { useMemo, useState } from 'react';
 import { Container, Section, Button, Card, Input, Select, Badge } from '@/components/site/UI';
 import { POSTS, CATEGORIES, TAGS } from '@/lib/site/blogData';
import { Link } from '@/i18n/navigation';


export  function TagChip({ children }){
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">{children}</span>;
}

export function BlogCard({ post }){
  return (
    <Card className="overflow-hidden">
      <Link href={`/site/blogs/${post.slug}`} className="block">
        <div className="aspect-[16/9] w-full bg-slate-200" style={{ backgroundImage: `url(${post.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </Link>
      <div className="p-4">
        <div className="text-xs text-slate-500">{new Date(post.date).toLocaleDateString()} • {post.readMins} min read</div>
        <Link href={`/site/blogs/${post.slug}`} className="mt-1 block font-semibold text-lg hover:underline">{post.title}</Link>
        <p className="mt-1 text-sm text-slate-600">{post.excerpt}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.tags.slice(0,3).map(t => <TagChip key={t}>{t}</TagChip>)}
        </div>
      </div>
    </Card>
  );
}


export function Newsletter(){
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState(false);
  function submit(e){ e.preventDefault(); setOk(true); /* TODO: POST /api/subscribe */ }
  if (ok) return <Card className="p-5 text-sm text-emerald-700 bg-emerald-50 border-emerald-100">Thanks! Check your inbox to confirm your subscription.</Card>;
  return (
    <Card className="p-5">
      <div className="font-semibold">Get new articles in your inbox</div>
      <p className="text-sm text-slate-600">One email per week. No spam, ever.</p>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <Input type="email" required placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <Button type="submit">Subscribe</Button>
      </form>
    </Card>
  );
}

 
export default function BlogIndex(){
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [tag, setTag] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return POSTS.filter(p =>
      (cat==='All' || p.category===cat) &&
      (tag==='All' || p.tags.includes(tag)) &&
      (!s || [p.title,p.excerpt,p.author.name,...p.tags].join(' ').toLowerCase().includes(s))
    ).sort((a,b)=> new Date(b.date)-new Date(a.date));
  }, [q,cat,tag]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page-1)*pageSize, page*pageSize);

  return (
    <Section>
      <Container>
        <div className="text-center max-w-2xl mx-auto">
          <Badge>Articles & Resources</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">Blog</h1>
          <p className="mt-2 text-slate-600">Training science, nutrition that works, and practical guides — no fluff.</p>
        </div>

        <Card className="mt-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input placeholder="Search articles…" value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} />
            <Select value={cat} onChange={e=>{ setCat(e.target.value); setPage(1); }}>{CATEGORIES.map(c=> <option key={c}>{c}</option>)}</Select>
            <Select value={tag} onChange={e=>{ setTag(e.target.value); setPage(1); }}>{['All',...TAGS].map(t=> <option key={t}>{t}</option>)}</Select>
            <Button variant='ghost' onClick={()=>{ setQ(''); setCat('All'); setTag('All'); setPage(1); }}>Reset</Button>
          </div>
        </Card>

        {slice.length ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {slice.map(p => <BlogCard key={p.slug} post={p} />)}
          </div>
        ) : (
          <Card className="mt-6 p-8 text-center">
            <div className="text-slate-700 font-medium">No articles match your filters.</div>
            <div className="text-slate-500 text-sm">Try another keyword or category.</div>
          </Card>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant='ghost' onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page===1}>Prev</Button>
            <div className="text-sm text-slate-700">Page {page} / {pages}</div>
            <Button variant='ghost' onClick={()=> setPage(p=> Math.min(pages, p+1))} disabled={page===pages}>Next</Button>
          </div>
        )}

        <div className="mt-10"><Newsletter /></div>
      </Container>
    </Section>
  );
}
 