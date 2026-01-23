"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Moon, Droplet, Pill, Flame, Bell, BarChart3, 
  Check, ArrowRight, Menu, X, Mail, Phone, MapPin,
  Target, Calendar, TrendingUp, Star, Users, Shield,
  Zap, Clock, Globe, MessageCircle, Twitter, Facebook, Linkedin, Instagram
} from "lucide-react";
const features = [
  {
    icon: Moon,
    title: "Smart Prayer Reminders",
    description: "Automatically syncs with your local prayer times. Get notified before or after each prayer with customizable offsets."
  },
  {
    icon: Droplet,
    title: "Hydration Tracking",
    description: "Set personalized water intake goals and receive gentle reminders throughout the day to stay healthy."
  },
  {
    icon: Pill,
    title: "Medicine Reminders",
    description: "Never miss a dose again. Schedule complex medication routines with repeat patterns and snooze options."
  },
  {
    icon: Flame,
    title: "Habit Streaks",
    description: "Build lasting habits with streak tracking. Visualize your consistency and celebrate milestones."
  },
  {
    icon: Bell,
    title: "Push Notifications",
    description: "Cross-platform alerts that work on web, mobile, and even Telegram. Stay on track anywhere."
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Gain insights into your habits with detailed analytics. Track completion rates and identify patterns."
  }
];
const steps = [
  {
    number: "01",
    title: "Create Your Goals",
    description: "Define the habits you want to build. Choose from templates like Adhkar, hydration, or create custom reminders tailored to your lifestyle."
  },
  {
    number: "02",
    title: "Set Your Schedule",
    description: "Configure flexible timing options: daily, weekly, interval-based, or synced with prayer times. We adapt to your routine."
  },
  {
    number: "03",
    title: "Track & Improve",
    description: "Monitor your streaks, analyze your progress, and celebrate wins. Our insights help you build habits that stick."
  }
];
const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "5 active reminders",
      "Basic push notifications",
      "Daily scheduling",
      "7-day streak history",
      "Community support"
    ],
    cta: "Start Free",
    popular: false
  },
  {
    name: "Basic",
    price: "$4.99",
    period: "/month",
    description: "For individuals building habits",
    features: [
      "25 active reminders",
      "Prayer time sync",
      "Weekly & monthly schedules",
      "30-day analytics",
      "Email support"
    ],
    cta: "Get Started",
    popular: false
  },
  {
    name: "Professional",
    price: "$9.99",
    period: "/month",
    description: "For serious habit builders",
    features: [
      "Unlimited reminders",
      "Advanced analytics",
      "Telegram integration",
      "Custom sounds",
      "Priority support",
      "Data export"
    ],
    cta: "Go Professional",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams and organizations",
    features: [
      "Everything in Professional",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise option"
    ],
    cta: "Contact Sales",
    popular: false
  }
];
const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Product Manager",
    initials: "SM",
    color: "bg-indigo-500",
    quote: "Reflect has completely transformed my morning routine. The prayer time sync is incredibly accurate, and the streak tracking keeps me motivated every single day."
  },
  {
    name: "Ahmed Hassan",
    role: "Software Engineer",
    initials: "AH",
    color: "bg-emerald-500",
    quote: "I've tried dozens of reminder apps, but nothing comes close to Reflect. The interval-based hydration reminders have genuinely improved my health."
  },
  {
    name: "Emily Chen",
    role: "Healthcare Professional",
    initials: "EC",
    color: "bg-amber-500",
    quote: "As a nurse, I recommended Reflect to my patients for medication reminders. The reliability and ease of use make it perfect for all ages."
  }
];
const faqs = [
  {
    question: "What is Reflect?",
    answer: "Reflect is a comprehensive reminder and habit tracking system designed to help you build positive daily routines. From prayer times to medication schedules, hydration goals to custom habits, Reflect keeps you on track with intelligent notifications."
  },
  {
    question: "How do prayer-time reminders work?",
    answer: "Our system automatically calculates prayer times based on your location. You can set reminders to trigger before or after each prayer (Fajr, Dhuhr, Asr, Maghrib, Isha) with customizable offsets. Times update automatically as seasons change."
  },
  {
    question: "Can I use this on multiple devices?",
    answer: "Yes! Reflect works seamlessly across all your devices. Your account syncs in real-time, so whether you're on your phone, tablet, or computer, your reminders and progress are always up to date."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use industry-standard encryption for all data transmission and storage. Your personal information and habit data are never shared with third parties. We're fully GDPR compliant."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel your subscription anytime from your account settings. There are no cancellation fees, and you'll continue to have access to paid features until the end of your billing period."
  },
  {
    question: "Do you offer refunds?",
    answer: "Yes, we offer a 14-day money-back guarantee for all paid plans. If you're not satisfied with Reflect, contact our support team within 14 days of purchase for a full refund."
  }
];
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">Reflect</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("features")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</button>
              <button onClick={() => scrollToSection("how-it-works")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</button>
              <button onClick={() => scrollToSection("pricing")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
              <button onClick={() => scrollToSection("faq")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
              <button onClick={() => scrollToSection("testimonials")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</button>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <a href="/auth">
                <Button variant="ghost">Log In</Button>
              </a>
              <a href="/auth">
                <Button>Get Started</Button>
              </a>
            </div>
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b px-4 py-4 space-y-4">
            <button onClick={() => scrollToSection("features")} className="block w-full text-left py-2 text-muted-foreground">Features</button>
            <button onClick={() => scrollToSection("how-it-works")} className="block w-full text-left py-2 text-muted-foreground">How It Works</button>
            <button onClick={() => scrollToSection("pricing")} className="block w-full text-left py-2 text-muted-foreground">Pricing</button>
            <button onClick={() => scrollToSection("faq")} className="block w-full text-left py-2 text-muted-foreground">FAQ</button>
            <button onClick={() => scrollToSection("testimonials")} className="block w-full text-left py-2 text-muted-foreground">Testimonials</button>
            <div className="pt-4 border-t space-y-2">
              <a href="/auth" className="block">
                <Button variant="outline" className="w-full">Log In</Button>
              </a>
              <a href="/auth" className="block">
                <Button className="w-full">Get Started</Button>
              </a>
            </div>
          </div>
        )}
      </nav>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="px-3 py-1">
                  <Star className="w-3 h-3 mr-1 inline" />
                  Trusted by 5,000+ users
                </Badge>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Master Your Daily Habits with 
                  <span className="text-primary"> Intelligent Reminders</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Build lasting habits with smart reminders that adapt to your lifestyle. From prayer times to hydration goals, Reflect keeps you on track effortlessly.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/auth">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Start Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" onClick={() => scrollToSection("how-it-works")}>
                  See How It Works
                </Button>
              </div>
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Free forever plan
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Cancel anytime
                </div>
              </div>
            </div>
            {/* Hero Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl" />
              <div className="relative bg-card border rounded-2xl p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <h3 className="font-display font-semibold">Today's Reminders</h3>
                    <Badge variant="secondary">3 Active</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Moon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Morning Adhkar</p>
                        <p className="text-xs text-muted-foreground">After Fajr Prayer</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">Done</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Droplet className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Drink Water</p>
                        <p className="text-xs text-muted-foreground">Every 2 hours</p>
                      </div>
                      <Badge variant="secondary">4/8</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
                      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-rose-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Vitamin D</p>
                        <p className="text-xs text-muted-foreground">8:00 PM</p>
                      </div>
                      <Badge variant="outline">Upcoming</Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Streak</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" /> 12 days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Logos/Trust */}
      <section className="py-12 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span className="font-medium">5,000+ Active Users</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-5 h-5" />
              <span className="font-medium">50+ Countries</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="font-medium">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Build Better Habits
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to help you stay consistent and achieve your goals every single day.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="font-display">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Get Started in Three Simple Steps
            </h2>
            <p className="text-lg text-muted-foreground">
              Setting up your personalized reminder system takes just a few minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground font-display text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                    {step.number}
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-border" />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <a href="/auth">
              <Button size="lg" className="gap-2">
                Start Your Journey <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that fits your needs. Upgrade or downgrade anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/auth" className="block">
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Loved by Thousands of Users
            </h2>
            <p className="text-lg text-muted-foreground">
              See what our community has to say about their experience with Reflect.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-white font-semibold text-sm`}>
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`} 
                className="bg-card border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
      {/* Contact Section */}
      <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <Badge variant="secondary" className="mb-4">Contact Us</Badge>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Get In Touch
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Have questions or need help? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground">support@reflect.app</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Live Chat</p>
                    <p className="text-muted-foreground">Available 9 AM - 6 PM EST</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">San Francisco, CA</p>
                  </div>
                </div>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input 
                        placeholder="Your name" 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea 
                      placeholder="How can we help you?" 
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                  <Button className="w-full" size="lg">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Habits?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who have already improved their daily routines with Reflect. Start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/auth">
              <Button size="lg" className="gap-2">
                Start Free Today <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <Button size="lg" variant="outline" onClick={() => scrollToSection("pricing")}>
              View Pricing
            </Button>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display text-xl font-bold text-white">Reflect</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-sm">
                Build better habits with intelligent reminders. Your personal companion for daily wellness and spiritual growth.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              2024 Reflect. All rights reserved.
            </p>
            <p className="text-slate-400 text-sm">
              Made with care for your daily wellness
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}