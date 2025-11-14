'use client';
import { Toaster } from 'react-hot-toast';
import { GlobalProvider } from '../../context/GlobalContext';
// import Header from './Header';
import { usePathname } from '../../i18n/navigation';
// import Sidebar from './Sidebar';
import ConfigAos from '@/config/Aos';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import dynamic from 'next/dynamic';
const DhikrLoading = dynamic(() => import('./DhikrLoading'), { ssr: false });
const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });
const Header = dynamic(() => import('./Header'), { ssr: false });

const LS_KEY = 'sidebar:collapsed';

export default function Layout({ children }) {
	const pathname = usePathname();

	const isAuthRoute = pathname.startsWith('/workouts/plans') || pathname.startsWith('/auth') || pathname.startsWith('/form') || pathname.startsWith('/thank-you') || pathname.startsWith('/site') || pathname === '/';

	// Mobile drawer open/close
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// Desktop collapsed (persisted)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	const [loading, setLoading] = useState(true);

	// Close mobile drawer when route changes
	useEffect(() => {
		setSidebarOpen(false);
	}, [pathname]);

	// Prevent body scroll when mobile drawer open
	useEffect(() => {
		if (sidebarOpen) document.body.style.overflow = 'hidden';
		else document.body.style.overflow = '';
		return () => (document.body.style.overflow = '');
	}, [sidebarOpen]);

	// Fake loading animation (kept from your code)
	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 2500);
		return () => clearTimeout(timer);
	}, [pathname]);

	// Load collapsed state from localStorage
	useEffect(() => {
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (raw === '1') setSidebarCollapsed(true);
		} catch { }
	}, []);

	// Persist collapsed state
	useEffect(() => {
		try {
			localStorage.setItem(LS_KEY, sidebarCollapsed ? '1' : '0');
		} catch { }
	}, [sidebarCollapsed]);

	// if (loading) {
	//   return <DhikrLoading />;
	// }


	return (
		<GlobalProvider>
			<div className='bg-gradient-to-b from-indigo-50 via-white to-white text-slate-800'>
				<div className='container !px-0 flex min-h-dvh'>
					{!isAuthRoute && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />}

					{/* Main area */}
					<div className='relative flex-1 min-w-0'>
						{!isAuthRoute && <Header onMenu={() => setSidebarOpen(true)} />}

						<AnimatePresence mode='wait'>
							<motion.main key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
								<div className={`${!isAuthRoute && 'bg-[#f7f9fc] h-[calc(100vh-65px)] overflow-auto max-md:p-3 p-4 overflow-x-hidden'}`}>{children}</div>
							</motion.main>
						</AnimatePresence>
					</div>
				</div>
			</div>
			{/* <PWAInstallPrompt /> */}
			<ConfigAos />
			<Toaster position='top-center' />
		</GlobalProvider>
	);
}
