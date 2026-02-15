"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
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
  Send,
  Heart,
  ArrowRight,
  Sparkles,
  Award,
  Users,
  Target,
  TrendingUp,
  Shield,
  CheckCircle2,
  Zap,
  Clock,
  Globe
} from "lucide-react";
import { useTheme } from "@/app/[locale]/theme";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hoveredSocial, setHoveredSocial] = useState(null);
  
  const t = useTranslations("home.footer");
  const { colors } = useTheme();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setIsSubscribing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubscribing(false);
    setIsSubscribed(true);
    setEmail("");
    
    // Reset after 3 seconds
    setTimeout(() => setIsSubscribed(false), 3000);
  };

  const footerLinks = {
    product: [
      { label: t("links.product.features"), href: "#features" },
      { label: t("links.product.pricing"), href: "#pricing" },
      { label: t("links.product.faq"), href: "#faq" },
      { label: t("links.product.testimonials"), href: "#testimonials" }
    ],
    company: [
      { label: t("links.company.about"), href: "#about" },
      { label: t("links.company.careers"), href: "#careers" },
      { label: t("links.company.blog"), href: "#blog" },
      { label: t("links.company.press"), href: "#press" }
    ],
    resources: [
      { label: t("links.resources.community"), href: "#community" },
      { label: t("links.resources.support"), href: "#support" },
      { label: t("links.resources.docs"), href: "#docs" },
      { label: t("links.resources.api"), href: "#api" }
    ],
    legal: [
      { label: t("links.legal.privacy"), href: "#privacy" },
      { label: t("links.legal.terms"), href: "#terms" },
      { label: t("links.legal.cookies"), href: "#cookies" },
      { label: t("links.legal.licenses"), href: "#licenses" }
    ]
  };

  const socialLinks = [
    { icon: Facebook, label: "Facebook", href: "#" },
    { icon: Twitter, label: "Twitter", href: "#" },
    { icon: Instagram, label: "Instagram", href: "#" },
    { icon: Linkedin, label: "LinkedIn", href: "#" },
    { icon: Youtube, label: "YouTube", href: "#" }
  ];

  const stats = [
    { icon: Users, value: t("stats.users.value"), label: t("stats.users.label") },
    { icon: Award, value: t("stats.trainers.value"), label: t("stats.trainers.label") },
    { icon: Target, value: t("stats.workouts.value"), label: t("stats.workouts.label") },
    { icon: TrendingUp, value: t("stats.success.value"), label: t("stats.success.label") }
  ];

  return (
    <footer className="relative pt-20 pb-8 bg-gradient-to-b from-slate-900 to-black overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs */}
        <motion.div 
          className="absolute top-0 ltr:right-20 rtl:left-20 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle, ${colors.primary[500]}, transparent)`,
          }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-0 ltr:left-20 rtl:right-20 w-[500px] h-[500px] rounded-full blur-3xl opacity-15"
          style={{
            background: `radial-gradient(circle, ${colors.secondary[500]}, transparent)`,
          }}
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.15, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 1 }}
        />

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(${colors.primary[500]} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary[500]} 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: colors.primary[400],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
 
 
        {/* Main Footer Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            {/* Brand Column - Enhanced */}
            <motion.div
              className="lg:col-span-4"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              {/* Logo */}
              <motion.div 
                className="flex items-center gap-3 mb-6 group cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative">
                  <motion.div 
                    className="absolute inset-0 rounded-lg blur-lg"
                    style={{
                      background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                    }}
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div 
                    className="relative w-14 h-14 rounded-lg flex items-center justify-center shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                    }}
                  >
                    <Dumbbell className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="text-white text-3xl font-black tracking-tight">So7baFit</span>
              </motion.div>

              <p className="text-white/70 leading-relaxed mb-8 text-base font-medium">
                {t("brand.description")}
              </p>

              {/* Contact Info - Enhanced */}
              <div className="space-y-4">
                {[
                  { icon: Mail, text: "info@fitnesshub.com", href: "mailto:info@fitnesshub.com" },
                  { icon: Phone, text: "+20 123 456 7890", href: "tel:+201234567890" },
                  { icon: MapPin, text: t("brand.location"), href: null }
                ].map((item, index) => {
                  const Icon = item.icon;
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {item.href ? (
                        <a
                          href={item.href}
                          className="flex items-center gap-4 text-white/70 hover:text-white transition-all group"
                        >
                          <motion.div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center transition-all"
                            style={{
                              backgroundColor: 'rgba(30, 41, 59, 0.6)',
                            }}
                            whileHover={{
                              backgroundColor: `${colors.primary[500]}30`,
                              scale: 1.05,
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </motion.div>
                          <span className="font-semibold">{item.text}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-4 text-white/70">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: 'rgba(30, 41, 59, 0.6)',
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="font-semibold">{item.text}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Links Columns - Enhanced */}
            <div className="lg:col-span-8 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
              {Object.entries(footerLinks).map(([category, links], colIndex) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: colIndex * 0.1, duration: 0.6 }}
                >
                  <h4 className="text-white font-black text-lg mb-6 capitalize">
                    {t(`links.${category}.title`)}
                  </h4>
                  <ul className="space-y-4">
                    {links.map((link, index) => (
                      <motion.li 
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: colIndex * 0.1 + index * 0.05 }}
                      >
                        <a
                          href={link.href}
                          className="text-white/60 hover:text-white transition-all flex items-center gap-3 group font-medium"
                        >
                          <motion.span 
                            className="w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                            }}
                            whileHover={{ scale: 1.5 }}
                          />
                          <span className="group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 transition-transform">
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

          {/* Divider */}
          <motion.div 
            className="h-px mb-8"
            style={{
              background: `linear-gradient(to right, transparent, ${colors.primary[500]}30, transparent)`,
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          />

          {/* Social Links & Bottom Bar - Enhanced */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Social Links */}
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-white/60 font-bold ltr:mr-2 rtl:ml-2">
                {t("social.title")}
              </span>
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                const isHovered = hoveredSocial === index;
                
                return (
                  <motion.a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="relative w-12 h-12 rounded-lg flex items-center justify-center transition-all group overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    }}
                    onMouseEnter={() => setHoveredSocial(index)}
                    onMouseLeave={() => setHoveredSocial(null)}
                    whileHover={{ scale: 1.1, rotate: 5, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Gradient overlay on hover */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                    <Icon className="w-5 h-5 text-white/60 group-hover:text-white transition-colors relative z-10" strokeWidth={2} />
                  </motion.a>
                );
              })}
            </motion.div>

            {/* Copyright */}
            <motion.div
              className="flex flex-col sm:flex-row items-center gap-3 text-white/60 text-sm font-medium"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span>{t("copyright.text")}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-2">
                {t("copyright.made")} 
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                </motion.div>
                {t("copyright.by")} 
                <span className="font-black text-white">FitnessHub</span>
              </span>
            </motion.div>
          </div>

          {/* Trust Badges - Enhanced */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {[
              { icon: Shield, text: t("trust.secure"), color: colors.primary[400] },
              { icon: CheckCircle2, text: t("trust.certified"), color: colors.secondary[400] },
              { icon: Award, text: t("trust.rated"), color: colors.primary[500] }
            ].map((badge, index) => {
              const Icon = badge.icon;
              
              return (
                <motion.div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: `${badge.color}10`,
                    border: `1px solid ${badge.color}20`,
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    backgroundColor: `${badge.color}20`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Icon className="w-4 h-4" style={{ color: badge.color }} />
                  <span className="font-semibold text-white/70">{badge.text}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </footer>
  );
}