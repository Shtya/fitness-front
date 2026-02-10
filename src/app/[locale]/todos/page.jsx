'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
	Calendar,
	Sunrise,
	ListChecks,
	Layers,
	Bell
} from 'lucide-react';

import { TabsPill } from '@/components/dashboard/ui/UI';
import BoardTab from './BoardTab';
import TodoTab from './TodoTab';
import CalendarTab from './CalendarTab';

export default function ProductivityDashboard() {
	const t = useTranslations('todos');

	/* =========================
		 Tabs
		 ========================= */
	const [activeTab, setActiveTab] = useState('calendar');

	const mainTabs = useMemo(
		() => [
			{ key: 'calendar', label: t('tabs.calendar') || 'التقويم', icon: Calendar },
			{ key: 'dashboard', label: t('tabs.dashboard') || 'المهام', icon: ListChecks },
			{ key: 'boards', label: t('tabs.boards') || 'لوحات', icon: Layers }
		],
		[t],
	);


	return (
		<div className="min-h-screen  ">
			{/* Animated Background */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
				<div className="absolute top-40 -left-40 w-96 h-96 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
				<div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
			</div>

			<div className="relative  space-y-6">
				{/* Header */}
				<div className=" w-full flex items-center justify-between backdrop-blur-xl bg-white/70  rounded-md shadow-md border border-slate-200/50 p-6 animate-fade-in-up">
					<div className="w-full  flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
						<div className="space-y-2">
							<h1 className="text-3xl md:text-4xl font-bold theme-gradient-text">{t('title') || 'لوحة الإنتاجية'}</h1>
							<p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('subtitle') || 'نظّم يومك.. خطوة بخطوة'}</p>
						</div>
					</div>
					{/* Tabs */}
					<TabsPill outerCn={"!w-[400px] "} hiddenArrow sliceInPhone={false} tabs={mainTabs} active={activeTab} onChange={setActiveTab} />
				</div>

				{activeTab === 'calendar' && <CalendarTab />}


				{activeTab === 'dashboard' && <TodoTab />}


				{activeTab === 'boards' && <BoardTab />}

			</div>

			{/* Local styles (blob) */}
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
