'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ClipboardList, MessageCircle, ShieldCheck, Workflow } from 'lucide-react';

const ITEMS = [
	{ key: 'coaches', icon: ShieldCheck },
	{ key: 'members', icon: Workflow },
	{ key: 'programs', icon: ClipboardList },
	{ key: 'roles', icon: MessageCircle },
];

export default function ProofStrip() {
	const t = useTranslations('home.hero.stats');
	const reduced = useReducedMotion();

	return (
		<section className="hm-proof" aria-label={t('programs.label')}>
			<div className="hm-container">
				<ul className="hm-proof__grid">
					{ITEMS.map((item, index) => {
						const Icon = item.icon;
						return (
							<motion.li
								key={item.key}
								className="hm-proof__item"
								initial={reduced ? false : { opacity: 0, y: 18 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: '-10% 0px' }}
								transition={{ duration: 0.55, delay: reduced ? 0 : index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
							>
								<span className="hm-proof__icon" aria-hidden="true">
									<Icon size={18} strokeWidth={2} />
								</span>
								<div>
									<p className="hm-proof__value">{t(`${item.key}.value`)}</p>
									<p className="hm-proof__label">{t(`${item.key}.label`)}</p>
								</div>
							</motion.li>
						);
					})}
				</ul>
			</div>
		</section>
	);
}
