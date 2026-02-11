'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import BoardTab from './BoardTab';
import TodoTab from './TodoTab';
import CalendarTab from './CalendarTab';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProductivityDashboard() {
	const searchParams = useSearchParams();

	const validTabs = ['calendar', 'tasks', 'boards'];

	const [activeTab, setActiveTab] = useState('calendar');

	useEffect(() => {
		const tabFromUrl = searchParams.get('tab');
		if (tabFromUrl && validTabs.includes(tabFromUrl)) {
			setActiveTab(tabFromUrl);
		}
	}, [searchParams]);


	return (
		<div className="min-h-screen  ">

			{activeTab === 'calendar' && <CalendarTab />}
			{activeTab === 'tasks' && <TodoTab />}
			{activeTab === 'boards' && <BoardTab />}

			<style jsx>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
		</div>
	);
}
