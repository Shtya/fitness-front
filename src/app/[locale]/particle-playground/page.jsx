'use client';

import dynamic from 'next/dynamic';

const ParticlePlayground = dynamic(
	() => import('@/components/particle-playground/particle-playground'),
	{ ssr: false },
);

export default function ParticlePlaygroundPage() {
	return <ParticlePlayground />;
}
