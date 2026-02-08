import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LandingNav from "@/components/LandingNav";
import Safe3DScene from "@/components/3D/Safe3DScene";
import { 
  ArrowRight, 
  CheckCircle, 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  Star,
  ChevronDown,
  ChevronUp,
  Calculator,
  BarChart3,
  Globe,
  FileText,
  Target,
  Activity,
  DollarSign,
  Lock,
  Clock,
  Award,
  Factory,
  Zap as EnergyIcon,
  Wheat,
  Ship
} from "lucide-react";
import "@/styles/landing-page-3d.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll for anchor links
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        e.preventDefault();
        const href = anchor.getAttribute('href');
        if (href) {
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  const features = [
    {
      title: "Advanced Pricing Engine",
      description: "Sophisticated pricing engine utilizing Black-76 model for commodity options, forwards and swaps. Monte Carlo simulations with 1000+ scenarios, real-time Greeks calculations.",
      image: "/landing-page/{643F46F8-1E4F-42EC-80D5-6F11AFC3C863}.png",
      icon: <Calculator className="w-6 h-6" />,
      highlights: ["Black-76 Model", "Monte Carlo 1000+", "Greeks Calculation", "15+ Instruments"],
      path: "/pricers"
    },
    {
      title: "Commodity Market Data",
      description: "Market data center with professional widgets, real-time screeners, and 26+ commodities across Energy, Metals, Agriculture and Livestock.",
      image: "/landing-page/{907F8717-005A-4D82-A8EB-1297751D649D}.png",
      icon: <Globe className="w-6 h-6" />,
      highlights: ["26+ Commodities", "Custom Tracking", "Real-time Screeners", "Multi-Source APIs"],
      path: "/commodity-market"
    },
    {
      title: "Strategy Builder",
      description: "Sophisticated strategy constructor enabling creation of complex structures: barriers, digitals, and zero-cost strategies with historical backtesting.",
      image: "/landing-page/{D85B4F5E-E1E0-46D1-859F-6225E4FEEC9B}.png",
      icon: <BarChart3 className="w-6 h-6" />,
      highlights: ["Barrier Options", "Zero-Cost Strategies", "Risk Matrix Analysis", "Historical Backtesting"],
      path: "/strategy-builder"
    },
    {
      title: "Risk Dashboard",
      description: "Executive dashboard with advanced risk metrics: multi-commodity VaR, hedge ratios, unhedged exposures with automatic alerts.",
      image: "/landing-page/{DCD200B8-AD66-4EFE-A2F4-99B0B822210E}.png",
      icon: <FileText className="w-6 h-6" />,
      highlights: ["Multi-Commodity VaR", "Hedge Ratio Tracking", "Real-time Alerts", "Major Commodities Monitor"],
      path: "/dashboard"
    },
    {
      title: "Rate Explorer",
      description: "Comprehensive interest rate management with yield curve bootstrapping, government bonds analysis, and interest rate futures tracking.",
      image: "/landing-page/{E5FFC7FA-3620-4616-9061-260F9BECE65D}.png",
      icon: <TrendingUp className="w-6 h-6" />,
      highlights: ["Yield Curve Bootstrapping", "Government Bonds", "Interest Rate Futures", "Multiple Interpolation Methods"],
      path: "/rate-explorer"
    },
    {
      title: "Hedge Assistant",
      description: "Assistant hedging FX et matières premières : stratégies, pricing forwards/options, données de l'app, analyse de risque.",
      image: "/landing-page/{E5FFC7FA-3620-4616-9061-260F9BECE65D}.png",
      icon: <Target className="w-6 h-6" />,
      highlights: ["FX & Commodities", "Stratégies", "Données app", "Pricing"],
      path: "/hedge-helper"
    }
  ];

  const stats = [
    { value: "€50B+", label: "Hedged Volume", icon: <DollarSign className="w-5 h-5" /> },
    { value: "500+", label: "Enterprise Clients", icon: <Users className="w-5 h-5" /> },
    { value: "99.9%", label: "Uptime", icon: <Activity className="w-5 h-5" /> },
    { value: "24/7", label: "Support", icon: <Clock className="w-5 h-5" /> }
  ];

  const sectors = [
    {
      title: "Freight & Shipping",
      description: "Manage container shipping rates, freight futures, and maritime logistics risk",
      icon: <Ship className="w-8 h-8" />,
      scene: <Safe3DScene sceneName="Hero" />,
      color: "from-blue-500/20 to-cyan-500/20"
    },
    {
      title: "Mining & Metals",
      description: "Hedge precious and base metals exposure with precision pricing models",
      icon: <Factory className="w-8 h-8" />,
      scene: <Safe3DScene sceneName="Mining" />,
      color: "from-amber-500/20 to-yellow-500/20"
    },
    {
      title: "Oil & Energy",
      description: "Advanced risk management for crude oil, natural gas, and refined products",
      icon: <EnergyIcon className="w-8 h-8" />,
      scene: <Safe3DScene sceneName="Oil" />,
      color: "from-green-500/20 to-emerald-500/20"
    },
    {
      title: "Agriculture",
      description: "Protect grain, softs, and livestock positions with sophisticated hedging",
      icon: <Wheat className="w-8 h-8" />,
      scene: <Safe3DScene sceneName="Agriculture" />,
      color: "from-orange-500/20 to-amber-500/20"
    }
  ];

  const benefits = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Bank-grade security with 256-bit encryption, multi-factor authentication, and SOC 2 Type II certification."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-Time Analytics",
      description: "Live market data and instant risk calculations with automatic alerts and notifications."
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Precision Pricing",
      description: "Advanced models including Black-76, Monte Carlo, and exotic option pricing with Greeks calculation."
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Industry Leading",
      description: "Trusted by 500+ enterprises managing billions in commodity risk exposure."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Treasury Director, TechCorp Global",
      content: "Commodity Risk Manager has transformed our risk management. We've reduced commodity exposure by 85% while maintaining operational flexibility.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "CFO, International Manufacturing",
      content: "The automated hedging strategies have saved us millions in commodity price fluctuation losses. The platform is intuitive and incredibly powerful.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      role: "Risk Manager, Global Retail Chain",
      content: "Real-time analytics and seamless execution. This platform gives us the confidence to expand internationally.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "How does automated commodity hedging work?",
      answer: "Our AI-powered platform continuously monitors your commodity exposures and market conditions, automatically executing hedging strategies based on your risk parameters and market opportunities."
    },
    {
      question: "What types of hedging instruments are supported?",
      answer: "We support forwards, options, swaps, and exotic derivatives. Our platform integrates with major banks and liquidity providers for optimal pricing and execution."
    },
    {
      question: "Is the platform suitable for small to medium businesses?",
      answer: "Absolutely! Our platform scales from SMEs with monthly exposures of $100K to large enterprises managing billions in commodity risk."
    },
    {
      question: "How secure is your platform?",
      answer: "We use bank-grade security with 256-bit encryption, multi-factor authentication, and are SOC 2 Type II certified. Your data and trades are fully protected."
    },
    {
      question: "Can I integrate with my existing ERP or Treasury system?",
      answer: "Yes, we offer APIs and pre-built connectors for SAP, Oracle, and other major systems. Our team handles the integration process end-to-end."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <LandingNav />
      
      {/* Hero Section with 3D Scene */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          transform: `translateY(${scrollY * 0.3}px)`,
        }}
      >
        {/* 3D Background */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Safe3DScene sceneName="Hero" />
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10"></div>
        
        {/* Hero Content */}
        <div className="relative z-20 text-center max-w-7xl mx-auto px-6 py-32">
          <div className="glass-card mb-8 inline-block">
            <Badge className="bg-[#C4D82E]/20 text-[#C4D82E] border-[#C4D82E]/50 px-6 py-2 text-sm font-semibold backdrop-blur-sm">
            Next-Generation Commodity Risk Management
          </Badge>
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 leading-tight tracking-tight">
            <span className="block text-white">Hedging</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] via-[#B4C82E] to-[#C4D82E] animate-shimmer">
              Commodities.
            </span>
            <span className="block text-white">Securing the</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] via-[#B4C82E] to-[#C4D82E] animate-shimmer">
              Future.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto font-light">
            Intelligent risk management platform that protects your business from commodity price volatility 
            with automated hedging strategies, real-time analytics, and enterprise-grade security.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <Button 
              size="lg" 
              className="glass-button-primary px-10 py-7 rounded-xl text-lg font-bold shadow-2xl hover:shadow-[#C4D82E]/50 transition-all duration-300 transform hover:scale-105"
              onClick={() => navigate('/login?mode=signup')}
            >
              Start Hedging Now
              <ArrowRight className="ml-3 w-5 h-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="glass-button-outline border-2 border-white/30 text-white hover:bg-white/10 px-10 py-7 rounded-xl text-lg font-bold backdrop-blur-sm transition-all duration-300"
              onClick={() => navigate('/login?mode=login')}
            >
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16">
            {stats.map((stat, index) => (
              <div key={index} className="glass-card p-6 group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-center mb-4 text-[#C4D82E] group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-2 group-hover:text-[#C4D82E] transition-colors duration-300">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
          <ChevronDown className="w-8 h-8 text-[#C4D82E]" />
        </div>
      </section>

      {/* Sectors Section with 3D Scenes */}
      <section id="sectors" className="py-32 bg-gradient-to-b from-black via-gray-950 to-black relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <Badge className="glass-card mb-6 bg-[#C4D82E]/10 text-[#C4D82E] border-[#C4D82E]/30 px-6 py-2">
              Commodity Sectors
            </Badge>
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-white">
              Global Trade
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] to-[#B4C82E]">
                Intelligence
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light">
              Comprehensive risk management across all commodity sectors
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {sectors.map((sector, index) => (
              <div key={index} className="group">
                <div className="glass-card-3d h-[500px] relative overflow-hidden rounded-2xl border border-white/10 hover:border-[#C4D82E]/50 transition-all duration-500 hover:scale-[1.02]">
                  {/* 3D Scene */}
                  <div className="absolute inset-0 opacity-70 group-hover:opacity-90 transition-opacity duration-500 z-0">
                    {sector.scene}
                  </div>
                  
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${sector.color} opacity-80 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
                    <div className="flex items-center mb-4">
                      <div className="glass-card p-3 rounded-xl mr-4 text-[#C4D82E]">
                        {sector.icon}
                      </div>
                      <h3 className="text-3xl font-black text-white">{sector.title}</h3>
                    </div>
                    <p className="text-gray-300 text-lg font-light">{sector.description}</p>
                  </div>
                  
                  {/* Neon Accent */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-[#C4D82E] rounded-full animate-pulse shadow-lg shadow-[#C4D82E]/50"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-black relative">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
            <Badge className="glass-card mb-6 bg-[#C4D82E]/10 text-[#C4D82E] border-[#C4D82E]/30 px-6 py-2">
                Platform Features
              </Badge>
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-white">
                Complete Platform for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] to-[#B4C82E]">
                Risk Management
              </span>
              </h2>
            </div>
          
          <div className="space-y-24">
            {features.map((feature, index) => (
              <div key={index} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
                  {/* Image Section */}
                  <div className="flex-1 w-full">
                  <div className="glass-card-3d overflow-hidden rounded-2xl border border-white/10 hover:border-[#C4D82E]/50 transition-all duration-500 group">
                    <div className="aspect-video overflow-hidden bg-gray-900 relative">
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                        />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
                  </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="flex-1 w-full">
                    <div className="lg:px-8">
                      <div className="flex items-center mb-6">
                      <div className="glass-card p-4 rounded-xl text-[#C4D82E] mr-4 shadow-lg shadow-[#C4D82E]/20">
                          {feature.icon}
                        </div>
                      <div className="text-sm font-bold text-[#C4D82E] uppercase tracking-wider">
                          Feature {index + 1}
                        </div>
                      </div>
                      
                    <h3 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
                        {feature.title}
                      </h3>
                      
                    <p className="text-lg text-gray-300 leading-relaxed mb-8 font-light">
                        {feature.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                      {feature.highlights.map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-3 glass-card p-3 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-[#C4D82E] flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-200">{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        variant="outline" 
                      className="glass-button-outline border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-bold transition-all duration-300"
                      onClick={() => navigate(feature.path)}
                      >
                      Explore {feature.title.split(' ')[0]}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 bg-gradient-to-b from-black via-gray-950 to-black relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="glass-card mb-6 bg-[#C4D82E]/10 text-[#C4D82E] border-[#C4D82E]/30 px-6 py-2">
              Why Choose Us
            </Badge>
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-white">
              Enterprise-Grade
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] to-[#B4C82E]">
                Risk Management
              </span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="glass-card-3d p-8 rounded-2xl border border-white/10 hover:border-[#C4D82E]/50 transition-all duration-500 hover:scale-105 group">
                <div className="glass-card w-16 h-16 rounded-xl flex items-center justify-center text-[#C4D82E] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-[#C4D82E]/20">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-black mb-3 text-white">{benefit.title}</h3>
                <p className="text-gray-400 leading-relaxed font-light">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-32 bg-black relative">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
            <Badge className="glass-card mb-6 bg-[#C4D82E]/10 text-[#C4D82E] border-[#C4D82E]/30 px-6 py-2">
                Trusted by Industry Leaders
              </Badge>
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-white">
                Join Thousands of Companies
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] to-[#B4C82E]">
                Managing Risk Better
              </span>
              </h2>
            </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="glass-card-3d p-8 rounded-2xl border border-white/10 hover:border-[#C4D82E]/50 transition-all duration-500 hover:scale-105">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-[#C4D82E] fill-current" />
                      ))}
                    </div>
                <p className="text-gray-300 mb-6 leading-relaxed font-light italic">"{testimonial.content}"</p>
                    <div>
                  <div className="font-bold text-white text-lg">{testimonial.name}</div>
                  <div className="text-sm text-gray-400">{testimonial.role}</div>
                </div>
                    </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-gradient-to-b from-black via-gray-950 to-black relative">
        <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
            <Badge className="glass-card mb-6 bg-[#C4D82E]/10 text-[#C4D82E] border-[#C4D82E]/30 px-6 py-2">
                Frequently Asked Questions
              </Badge>
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-white">
              Got Questions?
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] to-[#B4C82E]">
                We Have Answers
              </span>
              </h2>
            </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-card-3d rounded-2xl border border-white/10 hover:border-[#C4D82E]/50 transition-all duration-300 overflow-hidden">
                    <button
                  className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-[#C4D82E] rounded-2xl"
                      onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                    >
                      <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white pr-8">{faq.question}</h3>
                        {activeFAQ === index ? (
                      <ChevronUp className="w-5 h-5 text-[#C4D82E] flex-shrink-0" />
                        ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                    {activeFAQ === index && (
                  <div className="px-6 pb-6 animate-fadeIn">
                    <p className="text-gray-300 leading-relaxed font-light">{faq.answer}</p>
                      </div>
                    )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C4D82E]/10 via-transparent to-[#C4D82E]/10"></div>
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6">
            Ready to Transform Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C4D82E] to-[#B4C82E]">
              Risk Management?
            </span>
            </h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed font-light">
            Join industry leaders who trust our platform for their commodity risk management
            </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
              className="glass-button-primary px-10 py-7 rounded-xl text-lg font-bold shadow-2xl hover:shadow-[#C4D82E]/50 transition-all duration-300 transform hover:scale-105"
              onClick={() => navigate('/login?mode=signup')}
              >
                Start Free Trial
              <ArrowRight className="ml-3 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
              className="glass-button-outline border-2 border-white/30 text-white hover:bg-white/10 px-10 py-7 rounded-xl text-lg font-bold backdrop-blur-sm transition-all duration-300"
              onClick={() => navigate('/login?mode=login')}
              >
                Schedule Demo
              </Button>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-black border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-2xl font-black mb-4 text-[#C4D82E]">
                Commodity Risk
              </h3>
              <p className="text-gray-400 mb-6 font-light">
                Risk Management Platform
              </p>
              <p className="text-gray-500 leading-relaxed font-light">
                Intelligent commodity hedging solutions for enterprise risk management.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-white">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-[#C4D82E] transition-colors font-light">Features</a></li>
                <li><a href="/pricers" className="hover:text-[#C4D82E] transition-colors font-light">Pricing Engine</a></li>
                <li><a href="/commodity-market" className="hover:text-[#C4D82E] transition-colors font-light">Market Data</a></li>
                <li><a href="/strategy-builder" className="hover:text-[#C4D82E] transition-colors font-light">Strategy Builder</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#testimonials" className="hover:text-[#C4D82E] transition-colors font-light">About</a></li>
                <li><a href="#testimonials" className="hover:text-[#C4D82E] transition-colors font-light">Testimonials</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors font-light">FAQ</a></li>
                <li><a href="#contact" className="hover:text-[#C4D82E] transition-colors font-light">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-white">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors font-light">Documentation</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors font-light">Help Center</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors font-light">Privacy Policy</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors font-light">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 mb-4 md:mb-0 font-light">
              © 2024 Commodity Risk Management Platform. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-500 hover:text-[#C4D82E] transition-colors">
                <Users className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-500 hover:text-[#C4D82E] transition-colors">
                <Activity className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
