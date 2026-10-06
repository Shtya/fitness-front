'use client';

import BoardTab from './BoardTab';
import TodoTab from './TodoTab';
import CalendarTab from './CalendarTab';
import { useSearchParams } from 'next/navigation';

export default function ProductivityDashboard() {
	const searchParams = useSearchParams();
	const validTabs = ['calendar', 'tasks', 'boards'];
	const tabFromUrl = searchParams.get('tab');
	const activeTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'calendar';


	return (
		<div data-plain-page="1" className="report-phone min-h-full bg-white dark:bg-[#0b1220]">

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
