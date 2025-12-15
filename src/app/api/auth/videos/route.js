import { NextResponse } from 'next/server';

let videos = [
  {
    id: 'v1',
    title: 'Gym Intro - Welcome',
    description: 'Intro about the gym and safety rules.',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1554344058-2d0ec3b65f34?auto=format&fit=crop&w=1200&q=60',
    category: 'Gym',
    tags: ['intro', 'rules'],
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'v2',
    title: 'التشريح: العضلات الأساسية',
    description: 'شرح مبسط لأهم العضلات المستخدمة في التمرين.',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=60',
    category: 'Anatomy',
    tags: ['تشريح', 'عضلات'],
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ videos });
}

export async function POST(req) {
  const body = await req.json();
  const newItem = {
    ...body,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  videos = [newItem, ...videos];
  return NextResponse.json({ video: newItem });
}

export async function PUT(req) {
  const body = await req.json();
  videos = videos.map(v => (v.id === body.id ? body : v));
  return NextResponse.json({ video: body });
}

export async function DELETE(req) {
  const { id } = await req.json();
  videos = videos.filter(v => v.id !== id);
  return NextResponse.json({ ok: true });
}
