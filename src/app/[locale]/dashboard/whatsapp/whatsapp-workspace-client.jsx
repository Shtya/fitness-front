'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/**
 * The workspace depends on the socket, localStorage and IndexedDB, so a server
 * render produces nothing usable; loading it client-only keeps it out of the
 * server bundle and off the hydration path.
 */
const WhatsAppWorkspace = dynamic(() => import('./whatsapp-workspace'), {
	ssr: false,
	loading: () => (
		<div className="flex h-full min-h-[60vh] w-full items-center justify-center" aria-busy="true">
			<Loader2 size={22} className="animate-spin text-slate-400" />
		</div>
	),
});

export default WhatsAppWorkspace;
