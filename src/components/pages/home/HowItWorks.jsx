"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Award,
  Activity,
  Clock,
  BarChart3,
  Heart,
  User,
  Dumbbell,
  Trophy,
  Rocket
} from "lucide-react";
import { useTheme } from "@/app/[locale]/theme";

export default function HowItWorks() {
  const [hoveredStep, setHoveredStep] = useState(null);
  const [activeStep, setActiveStep] = useState(null);
  const t = useTranslations("home.howItWorks");
  const { colors } = useTheme();

  const steps = [
    {
      number: "01",
      icon: Target,
      title: t("steps.0.title"),
      description: t("steps.0.description"),
      features: [
        { icon: User, text: t("steps.0.features.0") },
        { icon: Target, text: t("steps.0.features.1") },
        { icon: Activity, text: t("steps.0.features.2") }
      ],
      illustration: {
        primary: Target,
        secondary: [CheckCircle2, Heart, Zap]
      }
    },
    {
      number: "02",
      icon: Calendar,
      title: t("steps.1.title"),
      description: t("steps.1.description"),
      features: [
        { icon: Calendar, text: t("steps.1.features.0") },
        { icon: Clock, text: t("steps.1.features.1") },
        { icon: Dumbbell, text: t("steps.1.features.2") }
      ],
      illustration: {
        primary: Calendar,
        secondary: [Clock, Dumbbell, CheckCircle2]
      }
    },
    {
      number: "03",
      icon: TrendingUp,
      title: t("steps.2.title"),
      description: t("steps.2.description"),
      features: [
        { icon: BarChart3, text: t("steps.2.features.0") },
        { icon: TrendingUp, text: t("steps.2.features.1") },
        { icon: Trophy, text: t("steps.2.features.2") }
      ],
      illustration: {
        primary: TrendingUp,
        secondary: [BarChart3, Award, Trophy]
      }
    }
  ];

  return (
    <section className="relative py-20 sm:py-24 md:py-28 lg:py-32 overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs */}
        <motion.div 
          className="absolute top-20 ltr:right-20 rtl:left-20 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle, ${colors.primary[400]}, transparent)`,
          }}
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.35, 0.2],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 ltr:left-20 rtl:right-20 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle, ${colors.secondary[400]}, transparent)`,
          }}
          animate={{ 
            scale: [1.3, 1, 1.3],
            opacity: [0.35, 0.2, 0.35],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 1 }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-15"
          style={{
            background: `radial-gradient(circle, ${colors.primary[300]}, transparent)`,
          }}
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.15, 0.25, 0.15],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
        />

        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 2 === 0 ? colors.primary[400] : colors.secondary[400],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 30 - 15, 0],
              opacity: [0, 0.7, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(${colors.primary[500]} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary[500]} 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Section Header */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Badge */}
          <motion.div 
            className="inline-flex items-center gap-3 px-8 py-4 rounded-lg mb-8 backdrop-blur-xl"
            style={{
              background: `linear-gradient(135deg, ${colors.primary[500]}20, ${colors.secondary[500]}20)`,
              border: `2px solid ${colors.primary[500]}30`,
              boxShadow: `0 10px 40px ${colors.primary[500]}20`,
            }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.3, 1],
              }}
              transition={{ 
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity },
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: colors.primary[400] }} />
            </motion.div>
            <span className="text-base font-black uppercase tracking-widest" style={{ color: colors.primary[300] }}>
              {t("badge")}
            </span>
          </motion.div>
          
          {/* Title */}
          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-none tracking-tighter">
            <motion.span
              style={{
                background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.via}, ${colors.gradient.to})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% 200%",
              }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {t("title")}
            </motion.span>
          </h2>
          
          {/* Description */}
          <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed font-medium">
            {t("description")}
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-10 max-w-7xl mx-auto mb-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const PrimaryIllustration = step.illustration.primary;
            const isHovered = hoveredStep === index;
            const isActive = activeStep === index;
            
            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.15, 
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1]
                }}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => setActiveStep(isActive ? null : index)}
              >
                {/* Connecting Arrow (Desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-32 ltr:left-full rtl:right-full w-full h-0.5 ltr:-ml-4 rtl:-mr-4 z-0">
                    <motion.div
                      className="h-full"
                      style={{
                        background: `linear-gradient(to right, ${colors.primary[500]}, ${colors.secondary[500]})`,
                        opacity: 0.3,
                      }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.8 + index * 0.2, duration: 0.8 }}
                    />
                    <motion.div
                      className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 + index * 0.2, type: "spring" }}
                    >
                      <motion.div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      >
                        <ArrowRight className="w-5 h-5 text-white" strokeWidth={3} />
                      </motion.div>
                    </motion.div>
                  </div>
                )}

                {/* Step Card */}
                <motion.div
                  className="relative bg-slate-800/40 backdrop-blur-2xl rounded-lg p-8 border-2 transition-all duration-500 cursor-pointer overflow-hidden group"
                  style={{
                    borderColor: isHovered || isActive 
                      ? colors.primary[500]
                      : `${colors.primary[500]}15`,
                    boxShadow: isHovered || isActive
                      ? `0 30px 60px -12px ${colors.primary[500]}40, 0 0 0 1px ${colors.primary[500]}20`
                      : '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
                  }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Animated Glow */}
                  <motion.div
                    className="absolute -inset-2 rounded-lg blur-2xl -z-10"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
                    }}
                    animate={{ 
                      opacity: isHovered || isActive ? 0.4 : 0,
                      scale: isHovered || isActive ? 1 : 0.8,
                    }}
                    transition={{ duration: 0.5 }}
                  />

                  {/* Shimmer Effect */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100"
                    style={{
                      background: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={isHovered ? {
                      backgroundPosition: ["200% 0", "-200% 0"],
                    } : {}}
                    transition={{ duration: 1.5, repeat: isHovered ? Infinity : 0 }}
                  />

                  <div className="relative z-10">
                    {/* Step Number Badge */}
                    <motion.div
                      className="absolute -top-6 ltr:-right-6 rtl:-left-6"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        delay: index * 0.15 + 0.4, 
                        type: "spring", 
                        stiffness: 200,
                        damping: 15
                      }}
                    >
                      <motion.div 
                        className="w-20 h-20 rounded-lg flex items-center justify-center shadow-2xl relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                        }}
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        {/* Inner glow */}
                        <motion.div
                          className="absolute inset-0 bg-white/20"
                          animate={isHovered ? {
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 0, 0.3],
                          } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-white text-3xl font-black relative z-10">{step.number}</span>
                      </motion.div>
                    </motion.div>

                    {/* Illustration Area - Enhanced */}
                    <div className="mb-8 relative h-56 flex items-center justify-center">
                      {/* Animated Background Circles */}
                      <div className="absolute inset-0">
                        <motion.div
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-10"
                          style={{
                            background: `radial-gradient(circle, ${colors.primary[500]}, transparent)`,
                          }}
                          animate={isHovered ? {
                            scale: [1, 1.3, 1],
                            rotate: [0, 360],
                          } : { scale: 1 }}
                          transition={{ duration: 4, repeat: isHovered ? Infinity : 0 }}
                        />
                        <motion.div
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full opacity-20"
                          style={{
                            background: `radial-gradient(circle, ${colors.secondary[500]}, transparent)`,
                          }}
                          animate={isHovered ? {
                            scale: [1.3, 1, 1.3],
                            rotate: [360, 0],
                          } : { scale: 1.3 }}
                          transition={{ duration: 3, repeat: isHovered ? Infinity : 0 }}
                        />
                        
                        {/* Orbiting Rings */}
                        <motion.div
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 opacity-20"
                          style={{
                            borderColor: colors.primary[500],
                          }}
                          animate={isHovered ? { rotate: 360 } : {}}
                          transition={{ duration: 8, repeat: isHovered ? Infinity : 0, ease: "linear" }}
                        />
                      </div>

                      {/* Primary Icon - Enhanced */}
                      <motion.div
                        className="relative z-10"
                        whileHover={{ 
                          scale: 1.15,
                          rotate: [0, -10, 10, -10, 0],
                        }}
                        transition={{ duration: 0.6 }}
                      >
                        <motion.div 
                          className="w-28 h-28 rounded-lg flex items-center justify-center shadow-2xl relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                          }}
                          animate={isHovered ? {
                            boxShadow: [
                              `0 20px 60px ${colors.primary[500]}40`,
                              `0 25px 80px ${colors.secondary[500]}60`,
                              `0 20px 60px ${colors.primary[500]}40`,
                            ],
                          } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {/* Animated background */}
                          <motion.div
                            className="absolute inset-0"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, ${colors.primary[300]}, transparent)`,
                            }}
                            animate={isHovered ? {
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 0.6, 0.3],
                            } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <PrimaryIllustration className="w-14 h-14 text-white relative z-10" strokeWidth={2.5} />
                        </motion.div>
                      </motion.div>

                      {/* Secondary Icons - Floating & Enhanced */}
                      {step.illustration.secondary.map((SecondaryIcon, idx) => {
                        const positions = [
                          { top: '5%', left: '5%' },
                          { top: '5%', right: '5%' },
                          { bottom: '5%', left: '15%' }
                        ];
                        
                        return (
                          <motion.div
                            key={idx}
                            className="absolute"
                            style={positions[idx]}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ 
                              opacity: isHovered ? 1 : 0.6,
                              scale: isHovered ? 1.1 : 0.9,
                              y: isHovered ? [0, -15, 0] : 0,
                              rotate: isHovered ? [0, 10, -10, 0] : 0,
                            }}
                            transition={{ 
                              delay: 0.6 + idx * 0.15,
                              y: { repeat: Infinity, duration: 2.5 + idx * 0.5 },
                              rotate: { repeat: Infinity, duration: 3 + idx * 0.5 },
                            }}
                            whileHover={{ scale: 1.3, rotate: 360 }}
                          >
                            <div 
                              className="w-14 h-14 backdrop-blur-xl border-2 rounded-lg flex items-center justify-center shadow-xl"
                              style={{
                                backgroundColor: `${colors.primary[900]}60`,
                                borderColor: `${colors.primary[500]}30`,
                              }}
                            >
                              <SecondaryIcon 
                                className="w-7 h-7"
                                style={{ color: colors.primary[400] }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Content */}
                    <div className="space-y-5">
                      {/* Title with Icon */}
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className="w-14 h-14 rounded-lg flex items-center justify-center shadow-lg shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
                          }}
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </motion.div>
                        <h3 className="text-2xl font-black text-white leading-tight">
                          {step.title}
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="text-white/70 leading-relaxed text-base font-medium">
                        {step.description}
                      </p>

                      {/* Features with Enhanced Design */}
                      <motion.div 
                        className="pt-5 space-y-3 border-t-2"
                        style={{
                          borderColor: `${colors.primary[500]}20`,
                        }}
                      >
                        <AnimatePresence>
                          {(isActive || isHovered) && step.features.map((feature, idx) => {
                            const FeatureIcon = feature.icon;
                            
                            return (
                              <motion.div
                                key={idx}
                                className="flex items-center gap-3 p-3 rounded-lg transition-all group/feature"
                                style={{
                                  backgroundColor: `${colors.primary[900]}20`,
                                }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ 
                                  delay: idx * 0.1,
                                  type: "spring",
                                  stiffness: 200,
                                  damping: 20
                                }}
                                whileHover={{ 
                                  x: 5,
                                  backgroundColor: `${colors.primary[900]}40`,
                                }}
                              >
                                <motion.div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
                                  }}
                                  whileHover={{ rotate: 360, scale: 1.1 }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <FeatureIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </motion.div>
                                <span className="text-sm text-white/80 font-semibold flex-1">
                                  {feature.text}
                                </span>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0 }}
                                  whileHover={{ opacity: 1, scale: 1 }}
                                >
                                  <CheckCircle2 
                                    className="w-5 h-5"
                                    style={{ color: colors.primary[400] }}
                                  />
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    {/* Bottom Accent Line */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-3xl"
                      style={{
                        background: `linear-gradient(to right, ${colors.gradient.from}, ${colors.gradient.to})`,
                      }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isHovered || isActive ? 1 : 0 }}
                      transition={{ duration: 0.4 }}
                    />

                    {/* Hover Indicator */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          className="absolute top-4 ltr:left-4 rtl:right-4"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                        >
                          <motion.div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: colors.primary[400],
                              boxShadow: `0 0 20px ${colors.primary[400]}`,
                            }}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [1, 0.5, 1],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <motion.button
            className="group relative px-10 py-5 rounded-lg font-black text-lg text-white shadow-2xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colors.gradient.from}, ${colors.gradient.to})`,
              boxShadow: `0 20px 60px ${colors.primary[500]}40`,
            }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
            <span className="relative flex items-center gap-3">
              {t("cta")}
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Rocket className="w-6 h-6" />
              </motion.div>
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}