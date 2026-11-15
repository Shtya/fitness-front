'use client';

import { Check, CheckCheck } from 'lucide-react';

export function GroupMessageReceiptsPanel({ receipts, locale, formatTime, resolveMember }) {
	const ar = locale === 'ar';
	const read = Array.isArray(receipts?.read) ? receipts.read : [];
	const delivered = Array.isArray(receipts?.delivered) ? receipts.delivered : [];
	const remaining = Array.isArray(receipts?.remaining) ? receipts.remaining : [];
	const total = Number(receipts?.total) || read.length + delivered.length + remaining.length;
	const sections = [
		{
			id: 'read',
			title: ar ? 'قرأها' : 'Read by',
			items: read,
			timeOf: entry => entry.readAt,
			icon: <CheckCheck size={18} className="text-[#53BDEB]" strokeWidth={2.5} />,
		},
		{
			id: 'delivered',
			title: ar ? 'وصلتله ولسه ما قرأهاش' : 'Delivered to (not read yet)',
			items: delivered,
			timeOf: entry => entry.deliveredAt,
			icon: <CheckCheck size={18} className="text-[#8696A0]" strokeWidth={2.5} />,
		},
		{
			id: 'remaining',
			title: ar ? 'لسه ما وصلتلوش' : 'Not delivered yet',
			items: remaining,
			timeOf: () => null,
			icon: <Check size={18} className="text-[#8696A0]" strokeWidth={2.5} />,
		},
	];
	return (
		<>
			<div className={`wa-mi__status is-${remaining.length || delivered.length ? (remaining.length ? 'sent' : 'delivered') : 'read'}`}>
				<span className="wa-mi__status-glyph">
					{remaining.length ? (
						<Check size={22} className="text-[#8696A0]" strokeWidth={2.5} />
					) : (
						<CheckCheck
							size={22}
							className={delivered.length ? 'text-[#8696A0]' : 'text-[#53BDEB]'}
							strokeWidth={2.5}
						/>
					)}
				</span>
				<div className="min-w-0 flex-1">
					<p className="wa-mi__status-label">{ar ? 'رسالة جروب' : 'Group message'}</p>
					<p className="wa-mi__status-value">
						{ar
							? `قرأها ${read.length} من ${total}`
							: `Read by ${read.length} of ${total}`}
					</p>
				</div>
			</div>
			{receipts?.tracked === false ? (
				<p className="wa-mi__step-hint px-1">
					{ar
						? 'مفيش إيصالات متسجلة للرسالة دي لسه. الإيصالات بتتسجل للرسايل اللي اتبعتت بعد التحديث ده، وبس من الأعضاء اللي مفعّلين علامات القراءة.'
						: 'No member receipts recorded for this message yet. Receipts are stored for messages sent after this update, and only from members who have read receipts on.'}
				</p>
			) : null}
			{receipts?.participantsKnown === false ? (
				<p className="wa-mi__step-hint px-1">
					{ar
						? 'قائمة أعضاء الجروب مش متحمّلة — افتح معلومات الجروب مرة عشان تظهر.'
						: 'Group member list is not loaded yet — open the group info once to load it.'}
				</p>
			) : null}
			{sections.map(section =>
				section.items.length ? (
					<section key={section.id} className="wa-mi__card">
						<h4 className="wa-mi__card-title flex items-center gap-2">
							{section.icon}
							<span className="flex-1">{section.title}</span>
							<span className="text-[12px] font-normal text-[#667781]">{section.items.length}</span>
						</h4>
						<ul className="wa-mi__rows">
							{section.items.map(entry => {
								const member = resolveMember(entry);
								// Like WhatsApp: just the time for today, a short date otherwise.
								const rawTime = section.timeOf(entry);
								const at = rawTime ? new Date(rawTime) : null;
								const time =
									at && !Number.isNaN(at.getTime())
										? at.toDateString() === new Date().toDateString()
											? at.toLocaleTimeString(ar ? 'ar-EG' : undefined, { hour: 'numeric', minute: '2-digit' })
											: at.toLocaleString(ar ? 'ar-EG' : undefined, {
													month: 'short',
													day: 'numeric',
													hour: 'numeric',
													minute: '2-digit',
												})
										: formatTime(rawTime);
								return (
									<li key={`${section.id}:${entry.key}`} className="wa-mi__row is-done">
										<div className="flex min-w-0 items-center gap-3">
											{member.avatar ? (
												<img
													src={member.avatar}
													alt=""
													className="size-9 shrink-0 rounded-full object-cover"
													loading="lazy"
												/>
											) : (
												<span className="wa-mi__avatar flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
													{String(member.name || '?').replace(/^\+/, '').slice(0, 1).toUpperCase()}
												</span>
											)}
											<div className="min-w-0">
												<p className="wa-mi__step-label truncate">{member.name}</p>
												{member.sub ? (
													<p className="wa-mi__step-hint truncate" dir="ltr">
														{member.sub}
													</p>
												) : null}
											</div>
										</div>
										{time ? <span className="wa-mi__row-time">{time}</span> : null}
									</li>
								);
							})}
						</ul>
					</section>
				) : null,
			)}
		</>
	);
}
