"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, Mail, Phone, MapPin,
  Facebook, Twitter, Instagram, Linkedin, Youtube,
  Heart, Award, Users, Target, TrendingUp,
  Shield, CheckCircle2,
} from "lucide-react";

// ─── Stable particles — never re-randomised ───────────────────────────────────
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 43 + 11) % 100}%`,
  top:  `${(i * 71 + 17) % 100}%`,
  dur:  3 + (i % 3),
  del:  (i * 0.22) % 2,
}));

// ─── Trust badge config — colours via Tailwind CSS var classes ────────────────
const TRUST_BADGES = [
  { icon: Shield,       textKey: "trust.secure",     iconCls: "text-[var(--color-primary-400)]",   bgCls: "bg-[var(--color-primary-400)]/[0.07]  border-[var(--color-primary-400)]/[0.15]"  },
  { icon: CheckCircle2, textKey: "trust.certified",  iconCls: "text-[var(--color-secondary-400)]", bgCls: "bg-[var(--color-secondary-400)]/[0.07] border-[var(--color-secondary-400)]/[0.15]" },
  { icon: Award,        textKey: "trust.rated",      iconCls: "text-[var(--color-primary-500)]",   bgCls: "bg-[var(--color-primary-500)]/[0.07]  border-[var(--color-primary-500)]/[0.15]"  },
];

const SOCIAL_LINKS = [
  { icon: Facebook,  label: "Facebook",  href: "#" },
  { icon: Twitter,   label: "Twitter",   href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin,  label: "LinkedIn",  href: "#" },
  { icon: Youtube,   label: "YouTube",   href: "#" },
];

const CONTACT_ITEMS = [
  { icon: Mail,   text: "info@so7bafit.com",  href: "mailto:info@so7bafit.com" },
  { icon: Phone,  text: "+20 123 456 7890",   href: "tel:+201234567890"        },
  { icon: MapPin, text: null /* from t() */,  href: null                        },
];

export default function Footer() {
  const [hoveredSocial, setHoveredSocial] = useState(null);
  const t = useTranslations("home.footer");

  const footerLinks = {
    product:   [
      { label: t("links.product.features"),    href: "#features"    },
      { label: t("links.product.pricing"),     href: "#pricing"     },
      { label: t("links.product.faq"),         href: "#faq"         },
      { label: t("links.product.testimonials"),href: "#testimonials" },
    ],
    company:   [
      { label: t("links.company.about"),   href: "#about"   },
      { label: t("links.company.careers"), href: "#careers" },
      { label: t("links.company.blog"),    href: "#blog"    },
      { label: t("links.company.press"),   href: "#press"   },
    ],
    resources: [
      { label: t("links.resources.community"), href: "#community" },
      { label: t("links.resources.support"),   href: "#support"   },
      { label: t("links.resources.docs"),      href: "#docs"      },
      { label: t("links.resources.api"),       href: "#api"       },
    ],
    legal:     [
      { label: t("links.legal.privacy"),  href: "#privacy"  },
      { label: t("links.legal.terms"),    href: "#terms"    },
      { label: t("links.legal.cookies"),  href: "#cookies"  },
      { label: t("links.legal.licenses"), href: "#licenses" },
    ],
  };

  const stats = [
    { icon: Users,     value: t("stats.users.value"),    label: t("stats.users.label")    },
    { icon: Award,     value: t("stats.trainers.value"), label: t("stats.trainers.label") },
    { icon: Target,    value: t("stats.workouts.value"), label: t("stats.workouts.label") },
    { icon: TrendingUp,value: t("stats.success.value"),  label: t("stats.success.label")  },
  ];

  // Contact items with translated location
  const contactItems = [
    { icon: Mail,   text: "info@so7bafit.com", href: "mailto:info@so7bafit.com" },
    { icon: Phone,  text: "+20 123 456 7890",  href: "tel:+201234567890"        },
    { icon: MapPin, text: t("brand.location"), href: null                        },
  ];

  return (
    <footer className="relative pt-20 pb-8 overflow-hidden
      bg-gradient-to-b from-slate-900 to-black">

      {/* ── Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 ltr:right-20 rtl:left-20
            w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.15]
            bg-[radial-gradient(circle,var(--color-primary-500),transparent)]"
          animate={{ scale:[1,1.2,1], opacity:[0.12,0.22,0.12] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 ltr:left-20 rtl:right-20
            w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.12]
            bg-[radial-gradient(circle,var(--color-secondary-500),transparent)]"
          animate={{ scale:[1.2,1,1.2], opacity:[0.18,0.12,0.18] }}
          transition={{ duration: 12, repeat: Infinity, delay: 1 }}
        />
        {/* Fine grid */}
        <div className="absolute inset-0 opacity-[0.015]
          bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
          bg-[size:50px_50px]" />
        {/* Stable particles */}
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[var(--color-primary-400)]"
            style={{ left: p.left, top: p.top }}
            animate={{ y:[0,-18,0], opacity:[0,0.55,0], scale:[0,1,0] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.del }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-16 py-12">

        {/* ── Main grid ── */}
        <div className="grid lg:grid-cols-12 gap-12 mb-14">

          {/* Brand column */}
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3 mb-6 w-fit cursor-pointer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className="relative">
                {/* Glow behind logo */}
                <motion.div
                  className="absolute inset-0 rounded-xl blur-lg theme-gradient-bg"
                  animate={{ opacity:[0.45,0.75,0.45], scale:[1,1.12,1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <div className="relative w-14 h-14 rounded-xl theme-gradient-bg
                  flex items-center justify-center shadow-2xl">
                  <Dumbbell className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <span className="font-display text-3xl text-white tracking-tight">So7baFit</span>
            </motion.div>

            <p className="font-body text-sm text-white/55 leading-relaxed mb-8 max-w-xs">
              {t("brand.description")}
            </p>

            {/* Contact info */}
            <div className="space-y-3">
              {contactItems.map((item, i) => {
                const Icon = item.icon;
                const inner = (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/70
                      group-hover:bg-[var(--color-primary-500)]/15
                      flex items-center justify-center
                      transition-colors duration-200 shrink-0">
                      <Icon className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
                    </div>
                    <span className="font-body text-sm text-white/55
                      group-hover:text-white/80 transition-colors font-medium">
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
                    {item.href
                      ? <a href={item.href} className="group">{inner}</a>
                      : <div className="group">{inner}</div>
                    }
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Link columns */}
          <div className="lg:col-span-8 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(footerLinks).map(([category, links], colIdx) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: colIdx * 0.09, duration: 0.55 }}
              >
                <h4 className="font-body text-white font-black text-sm uppercase
                  tracking-[0.12em] mb-5">
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
                        className="group flex items-center gap-2
                          font-body text-sm text-white/45
                          hover:text-white transition-colors duration-200"
                      >
                        {/* Dot indicator */}
                        <span className="w-1 h-1 rounded-full shrink-0
                          theme-gradient-bg opacity-0 group-hover:opacity-100
                          transition-opacity duration-200" />
                        <span className="group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1
                          transition-transform duration-200">
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

        {/* ── Divider ── */}
        <motion.div
          className="h-px mb-8 bg-gradient-to-r
            from-transparent via-[var(--color-primary-500)]/25 to-transparent"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        />

        {/* ── Social + copyright ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Social icons */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <span className="font-body text-xs font-bold uppercase tracking-[0.14em]
              text-white/35 ltr:mr-1 rtl:ml-1">
              {t("social.title")}
            </span>

            {SOCIAL_LINKS.map((social, i) => {
              const Icon     = social.icon;
              const isHover  = hoveredSocial === i;
              return (
                <motion.a
                  key={i}
                  href={social.href}
                  aria-label={social.label}
                  className="relative w-10 h-10 rounded-xl overflow-hidden
                    bg-slate-800/60 flex items-center justify-center"
                  onMouseEnter={() => setHoveredSocial(i)}
                  onMouseLeave={() => setHoveredSocial(null)}
                  whileHover={{ scale: 1.12, rotate: 5, y: -3 }}
                  whileTap={{ scale: 0.94 }}
                >
                  {/* Gradient overlay — pure Tailwind, toggled by state */}
                  <motion.div
                    className="absolute inset-0 theme-gradient-bg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHover ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                  />
                  <Icon className={[
                    "w-4 h-4 relative z-10 transition-colors duration-200",
                    isHover ? "text-white" : "text-white/45",
                  ].join(" ")} strokeWidth={2} />
                </motion.a>
              );
            })}
          </motion.div>

          {/* Copyright */}
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-2
              font-body text-xs text-white/35 font-medium"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <span>{t("copyright.text")}</span>
            <span className="hidden sm:inline text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              {t("copyright.made")}
              <motion.div
                animate={{ scale:[1,1.25,1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              </motion.div>
              {t("copyright.by")}
              <span className="font-black text-white">So7baFit</span>
            </span>
          </motion.div>
        </div>

        {/* ── Trust badges ── */}
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${bgCls}
                transition-all duration-200 hover:scale-105`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09 }}
            >
              <Icon className={`w-4 h-4 shrink-0 ${iconCls}`} />
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