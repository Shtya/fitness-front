import { NextResponse } from 'next/server';
import { getAiStatus } from '@/lib/ai-reading/provider';

export const runtime = 'nodejs';

export async function GET() {
	try {
		return NextResponse.json({ ai: getAiStatus() });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
