"use client";


import { Button, Card, Container, Section } from '@/components/site/UI';


const COACHES = [
{ id:'c1', name:'Ahmed Khaled', role:'Head Coach', certs:['REPs Level 3','CF-L1'], bio:'Strength specialist with 8+ years coaching groups and PT.', avatar:'' },
{ id:'c2', name:'Sara Mostafa', role:'Yoga & Mobility', certs:['RYT-200'], bio:'Focus on longevity, breathwork, and pain-free movement.', avatar:'' },
{ id:'c3', name:'Omar El-Sayed', role:'Conditioning', certs:['NSCA-CPT'], bio:'HIIT + endurance programming for fat loss and performance.', avatar:'' },
];


export default function CoachesPage(){
return (
<Section>
<Container>
<div className="text-center">
<h1 className="text-3xl sm:text-4xl font-extrabold">Meet the Coaches</h1>
<p className="mt-2 text-slate-600">Certified pros who care about your progress.</p>
</div>
<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
{COACHES.map(c => (
<Card key={c.id} className="p-5">
<div className="aspect-square w-full rounded-xl bg-slate-200" />
<div className="mt-3 font-semibold">{c.name}</div>
<div className="text-xs text-slate-500">{c.role}</div>
<div className="mt-2 text-sm text-slate-700">{c.bio}</div>
<div className="mt-2 text-xs text-slate-600">{c.certs.join(' • ')}</div>
<Button className="mt-4 w-full" href="/schedule" as='a'>Book PT</Button>
</Card>
))}
</div>
</Container>
</Section>
);
}