'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Container, Section, Button, Card, Badge } from '@/components/site/UI';
import { TagChip } from '../page';
import { Newsletter } from '../page';
import { getPost, getRelated } from '@/lib/site/blogData';

export default function BlogArticle({ params }) {
  const post = getPost(params.slug);
  const related = useMemo(() => getRelated(params.slug), [params.slug]);

  if (!post)
    return (
      <Section>
        <Container>
          <Card className='p-8 text-center'>
            <div className='font-semibold text-slate-800'>Article not found</div>
            <div className='text-slate-600 text-sm'>It may have been moved or unpublished.</div>
            <Button as={Link} href='/blog' className='mt-3'>
              Back to blog
            </Button>
          </Card>
        </Container>
      </Section>
    );

  const toc = post.content.filter(b => b.type === 'h2').map((b, i) => ({ id: `h-${i}`, text: b.text }));

  return (
    <Section>
      <Container>
        {/* Hero */}
        <div className='max-w-3xl mx-auto'>
          <div className='text-xs text-slate-500'>
            {new Date(post.date).toLocaleDateString()} • {post.readMins} min read
          </div>
          <h1 className='mt-2 text-3xl sm:text-4xl font-extrabold leading-tight'>{post.title}</h1>
          <div className='mt-2 text-sm text-slate-600'>
            By <span className='font-medium'>{post.author.name}</span> — {post.author.role}
          </div>
          <div className='mt-3 aspect-[16/9] w-full rounded-2xl bg-slate-200' style={{ backgroundImage: `url(${post.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>

        {/* Content + TOC */}
        <div className='mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8'>
          <article className='lg:col-span-8 max-w-3xl mx-auto prose prose-slate'>
            {post.content.map((b, i) => {
              if (b.type === 'p') return <p key={i}>{b.text}</p>;
              if (b.type === 'h2')
                return (
                  <h2 key={i} id={`h-${toc.findIndex(t => t.text === b.text)}`}>
                    {b.text}
                  </h2>
                );
              if (b.type === 'quote') return <blockquote key={i}>{b.text}</blockquote>;
              if (b.type === 'ul')
                return (
                  <ul key={i}>
                    {b.items.map((x, ix) => (
                      <li key={ix}>{x}</li>
                    ))}
                  </ul>
                );
              return null;
            })}
          </article>

          <aside className='lg:col-span-4'>
            {/* Table of contents */}
            {toc.length ? (
              <Card className='p-4 sticky top-20'>
                <div className='font-semibold'>On this page</div>
                <ul className='mt-2 space-y-1 text-sm'>
                  {toc.map((t, i) => (
                    <li key={i}>
                      <a className='text-slate-700 hover:underline' href={`#${t.id}`}>
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {/* Meta */}
            <Card className='p-4 mt-4'>
              <div className='text-xs text-slate-500'>Category</div>
              <div className='font-medium'>{post.category}</div>
              <div className='mt-2 text-xs text-slate-500'>Tags</div>
              <div className='mt-1 flex flex-wrap gap-1.5'>
                {post.tags.map(t => (
                  <TagChip key={t}>{t}</TagChip>
                ))}
              </div>
            </Card>
          </aside>
        </div>

        {/* Related */}
        {related.length ? (
          <div className='mt-10'>
            <div className='font-semibold mb-3'>Related articles</div>
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
              {related.map(p => (
                <Card key={p.slug} className='p-4'>
                  <div className='aspect-[16/9] w-full rounded-xl bg-slate-200' style={{ backgroundImage: `url(${p.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <Link href={`/blog/${p.slug}`} className='mt-2 block font-medium hover:underline'>
                    {p.title}
                  </Link>
                  <div className='text-xs text-slate-500'>
                    {new Date(p.date).toLocaleDateString()} • {p.readMins} min
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {/* Newsletter */}
        <div className='mt-10 max-w-3xl mx-auto'>
          <Newsletter />
        </div>

        <div className='mt-6'>
          <Button as={Link} href='/blog' variant='ghost'>
            ← Back to all articles
          </Button>
        </div>
      </Container>
    </Section>
  );
}
