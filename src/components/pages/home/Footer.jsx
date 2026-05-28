"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Heart,
  Award,
  Users,
  Target,
  TrendingUp,
  Shield,
  CheckCircle2,
} from "lucide-react";

const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 43 + 11) % 100}%`,
  top: `${(i * 71 + 17) % 100}%`,
  dur: 3 + (i % 3),
  del: (i * 0.22) % 2,
}));

const TRUST_BADGES = [
  {
    icon: Shield,
    textKey: "trust.secure",
    iconCls: "text-[var(--color-primary-400)]",
    bgCls:
      "bg-[var(--color-primary-400)]/[0.07] border-[var(--color-primary-400)]/[0.15]",
  },
  {
    icon: CheckCircle2,
    textKey: "trust.certified",
    iconCls: "text-[var(--color-secondary-400)]",
    bgCls:
      "bg-[var(--color-secondary-400)]/[0.07] border-[var(--color-secondary-400)]/[0.15]",
  },
  {
    icon: Award,
    textKey: "trust.rated",
    iconCls: "text-[var(--color-primary-500)]",
    bgCls:
      "bg-[var(--color-primary-500)]/[0.07] border-[var(--color-primary-500)]/[0.15]",
  },
];

const SOCIAL_LINKS = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
];

export default function Footer() {
  const [hoveredSocial, setHoveredSocial] = useState(null);
  const t = useTranslations("home.footer");

  const footerLinks = {
    product: [
      { label: t("links.product.features"), href: "#features" },
      { label: t("links.product.pricing"), href: "#pricing" },
      { label: t("links.product.faq"), href: "#faq" },
      { label: t("links.product.testimonials"), href: "#testimonials" },
    ],
    company: [
      { label: t("links.company.about"), href: "#about" },
      { label: t("links.company.careers"), href: "#careers" },
      { label: t("links.company.blog"), href: "#blog" },
      { label: t("links.company.press"), href: "#press" },
    ],
    resources: [
      { label: t("links.resources.community"), href: "#community" },
      { label: t("links.resources.support"), href: "#support" },
      { label: t("links.resources.docs"), href: "#docs" },
      { label: t("links.resources.api"), href: "#api" },
    ],
    legal: [
      { label: t("links.legal.privacy"), href: "#privacy" },
      { label: t("links.legal.terms"), href: "#terms" },
      { label: t("links.legal.cookies"), href: "#cookies" },
      { label: t("links.legal.licenses"), href: "#licenses" },
    ],
  };

  

  const contactItems = [
    { icon: Mail, text: "info@so7bafit.com", href: "mailto:info@so7bafit.com" },
    { icon: Phone, text: "+20 123 456 7890", href: "tel:+201234567890" },
    { icon: MapPin, text: t("brand.location"), href: null },
  ];

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-black pb-8 pt-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 h-[500px] w-[500px] rounded-full blur-3xl opacity-[0.15] ltr:right-20 rtl:left-20
          bg-[radial-gradient(circle,var(--color-primary-500),transparent)]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 h-[500px] w-[500px] rounded-full blur-3xl opacity-[0.12] ltr:left-20 rtl:right-20
          bg-[radial-gradient(circle,var(--color-secondary-500),transparent)]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.18, 0.12, 0.18] }}
          transition={{ duration: 12, repeat: Infinity, delay: 1 }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:50px_50px]"
        />
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[var(--color-primary-400)]"
            style={{ left: p.left, top: p.top }}
            animate={{ y: [0, -18, 0], opacity: [0, 0.55, 0], scale: [0, 1, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.del }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 py-12 lg:px-16">
        

        <div className="mb-14 grid gap-12 lg:grid-cols-12">
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="mb-6 flex w-fit cursor-pointer items-center gap-3"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className="relative">
                <motion.div
                  className="theme-gradient-bg absolute inset-0 rounded-lg blur-lg"
                  animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.12, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <div className="theme-gradient-bg relative flex h-14 w-14 items-center justify-center rounded-lg shadow-2xl">
                  <Dumbbell className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <span className="font-display text-3xl tracking-tight text-white">
                So7baFit
              </span>
            </motion.div>

            <p className="font-body mb-8 max-w-xs text-sm md: leading-relaxed text-white/55">
              {t("brand.description")}
            </p>

            <div className="space-y-3">
              {contactItems.map((item, i) => {
                const Icon = item.icon;
                const inner = (
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/70
                      transition-colors duration-200 group-hover:bg-[var(--color-primary-500)]/15"
                    >
                      <Icon className="h-4 w-4 text-white/50 transition-colors group-hover:text-white/80" />
                    </div>
                    <span className="font-body text-sm font-medium text-white/55 transition-colors group-hover:text-white/80">
                      {item.text}
                    </span>
                  </div>
                );

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    {item.href ? (
                      <a href={item.href} className="group">
                        {inner}
                      </a>
                    ) : (
                      <div className="group">{inner}</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:col-span-8">
            {Object.entries(footerLinks).map(([category, links], colIdx) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: colIdx * 0.09, duration: 0.55 }}
              >
                <h4 className="mb-5 font-body text-sm font-black uppercase tracking-[0.12em] text-white">
                  {t(`links.${category}.title`)}
                   
                </h4>
                <ul className="space-y-3.5">
                  {links.map((link, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: colIdx * 0.09 + idx * 0.04 }}
                    >
                      <a
                        href={link.href}
                        className="group flex items-center gap-2 font-body text-sm text-white/45 transition-colors duration-200 hover:text-white"
                      >
                        <span
                          className="theme-gradient-bg h-1 w-1 shrink-0 rounded-full opacity-0 transition-opacity duration-200
                          group-hover:opacity-100"
                        />
                        <span className="transition-transform duration-200 group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1">
                          {link.label}
                        </span>
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="mb-8 h-px bg-gradient-to-r from-transparent via-[var(--color-primary-500)]/25 to-transparent"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        />

        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <span className="font-body text-xs font-bold uppercase tracking-[0.14em] text-white/35 ltr:mr-1 rtl:ml-1">
              {t("social.title")}
            </span>

            {SOCIAL_LINKS.map((social, i) => {
              const Icon = social.icon;
              const isHover = hoveredSocial === i;

              return (
                <motion.a
                  key={i}
                  href={social.href}
                  aria-label={social.label}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-slate-800/60"
                  onMouseEnter={() => setHoveredSocial(i)}
                  onMouseLeave={() => setHoveredSocial(null)}
                  whileHover={{ scale: 1.12, rotate: 5, y: -3 }}
                  whileTap={{ scale: 0.94 }}
                >
                  <motion.div
                    className="theme-gradient-bg absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHover ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                  />
                  <Icon
                    className={[
                      "relative z-10 h-4 w-4 transition-colors duration-200",
                      isHover ? "text-white" : "text-white/45",
                    ].join(" ")}
                    strokeWidth={2}
                  />
                </motion.a>
              );
            })}
          </motion.div>

          <motion.div
            className="flex flex-col items-center gap-2 font-body text-xs font-medium text-white/35 sm:flex-row"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <span>{t("copyright.text")}</span>
            <span className="hidden text-white/20 sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              {t("copyright.made")}
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
              </motion.div>
              {t("copyright.by")}
              <span className="font-black text-white">So7baFit</span>
            </span>
          </motion.div>
        </div>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.2 }}
        >
          {TRUST_BADGES.map(({ icon: Icon, textKey, iconCls, bgCls }, i) => (
            <motion.div
              key={i}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 hover:scale-105 ${bgCls}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09 }}
            >
              <Icon className={`h-4 w-4 shrink-0 ${iconCls}`} />
              <span className="font-body text-xs font-bold text-white/55">
                {t(textKey)}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </footer>
  );
}