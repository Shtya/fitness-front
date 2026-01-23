'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dumbbell, Users, Calendar, Bell, TrendingUp, 
  MessageSquare, Award, FileText, Apple, Target,
  ChevronRight, Zap, Shield, Sparkles, BarChart3,
  Camera, Clock, CheckCircle2, Star, ArrowRight,
  Phone, Mail, MapPin, Check, X, Menu, Plus,
  Wallet, Settings, Video, Image, ListChecks,
  Activity, ChevronDown, PlayCircle, Quote, Heart,
  Flame, Crown, Rocket, Trophy, Coffee
} from 'lucide-react';

export default function FitnessLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [openFaq, setOpenFaq] = useState(null);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 12);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const capabilities = [
    {
      category: 'Workout Management',
      icon: Dumbbell,
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
      items: [
        'Custom exercise library with videos and images',
        'Weekly program builder with drag-and-drop',
        'Progressive overload tracking',
        'Exercise form video submissions and reviews',
        'Personal record (PR) tracking',
        'Rest timer and tempo controls',
        'Workout completion tracking',
        'Exercise substitution suggestions'
      ]
    },
    {
      category: 'Nutrition & Meal Planning',
      icon: Apple,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      items: [
        'Macro-based meal plan creator',
        'Daily meal logging and adherence tracking',
        'Supplement schedules with timing',
        'Food alternative suggestions',
        'Calorie and macronutrient analytics',
        'Weekly nutrition reports',
        'Meal prep templates',
        'Water intake tracking'
      ]
    },
    {
      category: 'Client Management',
      icon: Users,
      gradient: 'from-blue-500 via-cyan-500 to-sky-500',
      items: [
        'Multi-client dashboard',
        'Client onboarding with custom forms',
        'Subscription and payment tracking',
        'Client notes and history',
        'Bulk actions and batch updates',
        'Client grouping and tags',
        'Activity timeline',
        'Performance benchmarking'
      ]
    },
    {
      category: 'Progress Tracking',
      icon: TrendingUp,
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      items: [
        'Body measurement tracking',
        '4-angle progress photos',
        'Weight and body composition graphs',
        'Strength progression charts',
        'Before/after comparisons',
        'Weekly check-in reports',
        'Goal setting and milestones',
        'Export progress reports'
      ]
    },
    {
      category: 'Communication',
      icon: MessageSquare,
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      items: [
        'In-app real-time messaging',
        'Group chat support',
        'File and media sharing',
        'Voice note support',
        'Telegram bot integration',
        'Push notifications',
        'Read receipts',
        'Message search and history'
      ]
    },
    {
      category: 'Smart Reminders',
      icon: Bell,
      gradient: 'from-indigo-500 via-blue-500 to-purple-500',
      items: [
        'Workout reminders',
        'Meal time notifications',
        'Water intake alerts',
        'Supplement reminders',
        'Custom appointment reminders',
        'Prayer time integration',
        'Recurring schedules',
        'Multi-channel delivery (Web, Telegram)'
      ]
    },
    {
      category: 'Analytics & Reports',
      icon: BarChart3,
      gradient: 'from-cyan-500 via-teal-500 to-emerald-500',
      items: [
        'Client adherence dashboards',
        'Weekly automated reports',
        'Nutrition compliance metrics',
        'Workout completion rates',
        'Revenue and billing analytics',
        'Client retention insights',
        'Performance trends',
        'Custom report generation'
      ]
    },
    {
      category: 'Business Management',
      icon: Wallet,
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
      items: [
        'Multi-tier subscriptions',
        'Payment processing',
        'Commission tracking',
        'Withdrawal requests',
        'Invoice generation',
        'Client payment history',
        'Revenue reports',
        'Refund management'
      ]
    },
    {
      category: 'White-Label & Customization',
      icon: Settings,
      gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
      items: [
        'Custom branding and logo',
        'Domain customization',
        'Theme color picker',
        'SEO optimization',
        'Custom page builder',
        'Email templates',
        'Language settings',
        'Timezone configuration'
      ]
    },
    {
      category: 'Gamification',
      icon: Award,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      items: [
        'Points and rewards system',
        'Streak tracking',
        'Achievement badges',
        'Leaderboards',
        'Challenge creation',
        'Milestone celebrations',
        'Progress levels',
        'Social sharing'
      ]
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Sign Up & Setup',
      description: 'Create your account, customize your branding, and set up your gym profile in minutes.',
      icon: Users
    },
    {
      step: 2,
      title: 'Add Your Clients',
      description: 'Import existing clients or use custom intake forms to onboard new members seamlessly.',
      icon: FileText
    },
    {
      step: 3,
      title: 'Build Programs',
      description: 'Create personalized workout and meal plans using our intuitive builder with drag-and-drop.',
      icon: Dumbbell
    },
    {
      step: 4,
      title: 'Track & Communicate',
      description: 'Monitor client progress, provide feedback, and stay connected through real-time chat.',
      icon: MessageSquare
    },
    {
      step: 5,
      title: 'Analyze & Optimize',
      description: 'Review analytics, weekly reports, and metrics to continuously improve client results.',
      icon: TrendingUp
    }
  ];

  const features = [
    {
      icon: Dumbbell,
      title: 'Exercise Program Builder',
      description: 'Create comprehensive workout plans with custom exercises, sets, reps, tempo, and rest periods. Visual day-by-day planning.',
      highlight: 'Drag & Drop Interface',
      color: 'from-violet-500 to-purple-600',
      emoji: '💪'
    },
    {
      icon: Apple,
      title: 'Meal Plan Designer',
      description: 'Build detailed nutrition plans with macro tracking, meal timing, supplements, and food alternatives for every client.',
      highlight: 'Macro Calculator Included',
      color: 'from-emerald-500 to-green-600',
      emoji: '🥗'
    },
    {
      icon: Bell,
      title: 'Multi-Channel Reminders',
      description: 'Automated notifications via Web Push and Telegram for workouts, meals, water, medicine, and custom schedules.',
      highlight: 'Never Miss a Beat',
      color: 'from-blue-500 to-cyan-600',
      emoji: '🔔'
    },
    {
      icon: Video,
      title: 'Form Check System',
      description: 'Clients submit exercise videos for form review. Coaches provide feedback and track improvement over time.',
      highlight: 'Video Analysis',
      color: 'from-pink-500 to-rose-600',
      emoji: '🎥'
    },
    {
      icon: Camera,
      title: 'Progress Photo Tracking',
      description: '4-angle photo uploads with measurements, weight, and notes. Automatic before/after comparisons.',
      highlight: 'Visual Transformation',
      color: 'from-orange-500 to-amber-600',
      emoji: '📸'
    },
    {
      icon: BarChart3,
      title: 'Weekly Check-in Reports',
      description: 'Automated weekly questionnaires covering diet, training, sleep, and measurements with coach feedback.',
      highlight: 'Automated Reports',
      color: 'from-cyan-500 to-teal-600',
      emoji: '📊'
    },
    {
      icon: MessageSquare,
      title: 'Real-Time Chat',
      description: 'Built-in messaging with file sharing, group chats, read receipts, and full conversation history.',
      highlight: 'Stay Connected',
      color: 'from-indigo-500 to-purple-600',
      emoji: '💬'
    },
    {
      icon: Award,
      title: 'Gamification Engine',
      description: 'Points, streaks, achievements, and leaderboards to keep clients motivated and engaged daily.',
      highlight: 'Boost Retention',
      color: 'from-yellow-500 to-orange-600',
      emoji: '🏆'
    },
    {
      icon: Wallet,
      title: 'Billing & Payments',
      description: 'Subscription management, payment tracking, commission calculation, and automated invoicing.',
      highlight: 'Financial Control',
      color: 'from-fuchsia-500 to-pink-600',
      emoji: '💰'
    },
    {
      icon: Settings,
      title: 'White-Label Platform',
      description: 'Complete customization: your logo, colors, domain, SEO, and branded client experience.',
      highlight: 'Your Brand',
      color: 'from-purple-500 to-violet-600',
      emoji: '🎨'
    },
    {
      icon: ListChecks,
      title: 'Custom Intake Forms',
      description: 'Create dynamic onboarding forms with 12+ field types. Track submissions and auto-assign clients.',
      highlight: 'Flexible Forms',
      color: 'from-red-500 to-pink-600',
      emoji: '📝'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Client adherence metrics, performance trends, revenue reports, and actionable insights dashboard.',
      highlight: 'Data-Driven Decisions',
      color: 'from-green-500 to-emerald-600',
      emoji: '📈'
    }
  ];

  const pricing = [
    {
      name: 'Starter',
      price: 29,
      period: 'month',
      description: 'Perfect for individual coaches getting started',
      features: [
        'Up to 10 active clients',
        'Exercise & meal plan builder',
        'Progress tracking',
        'Basic analytics',
        'Client chat messaging',
        'Mobile app access',
        'Email support'
      ],
      limitations: [
        'No white-label branding',
        'No custom domain',
        'Limited to 1 coach',
        'Basic reporting only'
      ],
      popular: false
    },
    {
      name: 'Professional',
      price: 79,
      period: 'month',
      description: 'For growing coaching businesses',
      features: [
        'Up to 50 active clients',
        'Everything in Starter',
        'White-label branding',
        'Custom domain',
        'Advanced analytics',
        'Automated reports',
        'Form check reviews',
        'Up to 3 coaches',
        'Priority support',
        'API access'
      ],
      limitations: [
        'Limited to 3 coaches',
        'Basic customization'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 199,
      period: 'month',
      description: 'For gyms and large coaching teams',
      features: [
        'Unlimited clients',
        'Everything in Professional',
        'Unlimited coaches',
        'Full white-label control',
        'Custom page builder',
        'Advanced customization',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        '24/7 premium support',
        'Training & onboarding'
      ],
      limitations: [],
      popular: false
    }
  ];

  const faqs = [ 
    {
      question: 'Can I use my own domain and branding?',
      answer: 'Yes! Professional and Enterprise plans include full white-label capabilities. You can use your own domain, logo, brand colors, and customize the entire client experience to match your brand identity.'
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'You maintain full ownership of your data. Before cancellation, you can export all client information, programs, and history. We also provide a 30-day grace period where your data remains accessible in read-only mode.'
    },
    {
      question: 'Do my clients need to download anything?',
      answer: 'No downloads required! The platform works seamlessly on any device through web browsers. However, we also offer optional progressive web app (PWA) installation for a native app-like experience on mobile devices.'
    },
    {
      question: 'Is there a limit to the number of programs I can create?',
      answer: 'No limits! Create unlimited workout programs, meal plans, and templates. You can also duplicate and customize existing programs to save time when onboarding similar clients.'
    },
    {
      question: 'How does the reminder system work?',
      answer: 'Our smart reminder system sends notifications through web push notifications and Telegram. Clients can set personalized schedules for workouts, meals, water intake, supplements, and more. All notifications are timezone-aware and respect quiet hours.'
    },
    {
      question: 'Can I migrate from my current platform?',
      answer: 'Yes! We provide data migration assistance for Professional and Enterprise plans. Our team will help you import your existing client data, programs, and ensure a smooth transition with minimal disruption.'
    },
    {
      question: 'What kind of support do you offer?',
      answer: 'Starter plans include email support (24-48hr response time). Professional plans get priority email support (12hr response). Enterprise plans include 24/7 support via email, chat, and phone, plus a dedicated account manager.'
    },
    {
      question: 'Is the payment processing secure?',
      answer: 'Absolutely. We use industry-standard encryption and PCI-compliant payment processors. All financial data is encrypted both in transit and at rest. We never store full credit card details on our servers.'
    } 
  ];

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'Personal Trainer, FitLife Studio',
      image: '👩‍💼',
      content: 'This platform completely transformed how I manage my clients. The automated check-ins and progress tracking save me 10+ hours per week. My client retention has increased by 40% since switching.',
      rating: 5
    }, 
    {
      name: 'Elena Rodriguez',
      role: 'Nutrition Specialist',
      image: '👩‍⚕️',
      content: 'The meal planning tools are incredible. I can create detailed nutrition plans in minutes and the macro tracking helps clients stay accountable. The analytics show real results.',
      rating: 5
    },
    {
      name: 'David Chen',
      role: 'Gym Owner, PowerFit',
      image: '👨‍💼',
      content: 'Managing 5 coaches and 150+ clients used to be chaos. Now everything is organized in one place. The billing automation alone has paid for itself. Highly recommend for gym owners.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2.5 rounded-lg">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900">FitnessPro</span>
            </div>
            
            <div className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">How It Works</a>
              <a href="#capabilities" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Capabilities</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Testimonials</a>
              <a href="#faq" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">FAQ</a>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" className="text-slate-900">
                Sign In
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <button 
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t pt-4">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-slate-600 font-medium">Features</a>
                <a href="#how-it-works" className="text-slate-600 font-medium">How It Works</a>
                <a href="#capabilities" className="text-slate-600 font-medium">Capabilities</a>
                <a href="#pricing" className="text-slate-600 font-medium">Pricing</a>
                <a href="#testimonials" className="text-slate-600 font-medium">Testimonials</a>
                <a href="#faq" className="text-slate-600 font-medium">FAQ</a>
                <Button className="bg-slate-900 text-white w-full">Start Free Trial</Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-slate-100 text-slate-900 border-slate-200 px-4 py-2 text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-2 inline" />
              Trusted by 1,000+ Fitness Professionals
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-slate-900">
              The Complete Platform for
              <span className="block text-slate-900 mt-2">Modern Fitness Coaching</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Everything you need to manage clients, build programs, track progress, and grow your fitness business—all in one powerful platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-6 text-lg">
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold px-8 py-6 text-lg">
                <PlayCircle className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            <p className="text-sm text-slate-500">No credit card required • Cancel anytime • Full access to all features</p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              <div>
                <div className="text-4xl font-bold text-slate-900">15+</div>
                <div className="text-slate-600 mt-1">Core Modules</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-slate-900">40+</div>
                <div className="text-slate-600 mt-1">Entity Types</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-slate-900">99.9%</div>
                <div className="text-slate-600 mt-1">Uptime SLA</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-slate-900">24/7</div>
                <div className="text-slate-600 mt-1">Automation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get up and running in 5 simple steps
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {howItWorks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex gap-6 mb-12 last:mb-0">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <div className="flex items-start gap-4">
                        <Icon className="w-8 h-8 text-slate-900 flex-shrink-0" />
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.title}</h3>
                          <p className="text-slate-600 text-lg">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-slate-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              Powerful Features
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to deliver exceptional coaching experiences
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="border-slate-200 hover:shadow-lg transition-shadow bg-white">
                  <CardHeader>
                    <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <Badge variant="secondary" className="w-fit">{feature.highlight}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full Capabilities */}
      <section id="capabilities" className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              Complete System Capabilities
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything your fitness business needs in one comprehensive platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <Card key={idx} className="border-slate-200 bg-white">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-2xl">{cap.category}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {cap.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-slate-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Choose the plan that fits your business. Upgrade or downgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`border-2 ${plan.popular ? 'border-slate-900 shadow-xl relative' : 'border-slate-200'} bg-white`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-slate-900 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold text-slate-900">${plan.price}</span>
                    <span className="text-slate-600 ml-2">/ {plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    className={`w-full mb-6 ${plan.popular ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                    size="lg"
                  >
                    {plan.popular ? 'Start Free Trial' : 'Get Started'}
                  </Button>
                  
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-slate-200">
                      {plan.limitations.map((limitation, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <X className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-500">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">Need a custom plan for your organization?</p>
            <Button variant="outline" size="lg" className="border-slate-300">
              Contact Sales
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              Loved by Fitness Professionals
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              See what coaches and gym owners are saying about FitnessPro
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="border-slate-200 bg-white">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl">
                      {testimonial.image}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-900">{testimonial.name}</div>
                      <div className="text-sm text-slate-600">{testimonial.role}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <Quote className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-slate-700 leading-relaxed">{testimonial.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-slate-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need to know about FitnessPro
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="border-slate-200 bg-white">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">{faq.question}</CardTitle>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
                {openFaq === idx && (
                  <CardContent>
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="py-20 px-6 bg-slate-900 text-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl font-bold mb-6">Get in Touch</h2>
              <p className="text-slate-300 text-lg mb-8">
                Have questions? Want to see a demo? Our team is here to help you succeed.
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Email Us</div>
                    <div className="text-slate-400">support@fitnesspro.com</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Call Us</div>
                    <div className="text-slate-400">+1 (555) 123-4567</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Visit Us</div>
                    <div className="text-slate-400">123 Fitness St, Wellness City, FC 12345</div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="bg-white border-0">
              <CardHeader>
                <CardTitle className="text-slate-900">Send us a message</CardTitle>
                <CardDescription>We'll get back to you within 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <Input placeholder="Your Name" className="border-slate-300" />
                  </div>
                  <div>
                    <Input type="email" placeholder="Your Email" className="border-slate-300" />
                  </div>
                  <div>
                    <Input placeholder="Subject" className="border-slate-300" />
                  </div>
                  <div>
                    <Textarea placeholder="Your Message" rows={4} className="border-slate-300" />
                  </div>
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                    Send Message
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-white border-t border-slate-200">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
            Ready to Transform Your Coaching Business?
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Join thousands of fitness professionals using FitnessPro to deliver exceptional results
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-10 py-7 text-xl">
              Start Your 14-Day Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-slate-300 text-slate-900 font-semibold px-10 py-7 text-xl">
              Schedule a Demo
            </Button>
          </div>
          
          <p className="text-sm text-slate-500 mt-6">No credit card required • Full feature access • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6 bg-slate-50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-slate-900 p-2 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-slate-900">FitnessPro</span>
              </div>
              <p className="text-slate-600 text-sm">
                The complete platform for modern fitness coaching and client management.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900">Integrations</a></li>
                <li><a href="#" className="hover:text-slate-900">API Docs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li><a href="#" className="hover:text-slate-900">About Us</a></li>
                <li><a href="#" className="hover:text-slate-900">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900">Careers</a></li>
                <li><a href="#contact" className="hover:text-slate-900">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li><a href="#" className="hover:text-slate-900">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-900">Terms of Service</a></li>
                <li><a href="#" className="hover:text-slate-900">Security</a></li>
                <li><a href="#" className="hover:text-slate-900">GDPR</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-500 text-sm">
              © 2026 FitnessPro. All rights reserved.
            </div>
            <div className="flex gap-6 text-slate-500">
              <a href="#" className="hover:text-slate-900 transition-colors">Twitter</a>
              <a href="#" className="hover:text-slate-900 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Instagram</a>
              <a href="#" className="hover:text-slate-900 transition-colors">YouTube</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}