import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnimatedBackground from "@/components/AnimatedBackground";
import LandingNav from "@/components/LandingNav";
import ScrollReveal from "@/components/ScrollReveal";
import { 
  ArrowRight, 
  Play, 
  CheckCircle, 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  BarChart3,
  Calculator,
  Globe,
  FileText
} from "lucide-react";
import "@/styles/landing-page.css";

const LandingPage = () => {
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  // Parallax effect for hero section
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const heroBackground = document.getElementById('hero-background');
      if (heroBackground) {
        heroBackground.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "Advanced Pricing Engine",
      description: "Sophisticated pricing engine utilizing Black-76 model for commodity options, forwards and swaps. Monte Carlo simulations with 1000+ scenarios, real-time Greeks calculations, and support for 15+ instrument types including barriers, digitals and exotic structures with cost of carry adjustments.",
      image: "/landing-page/{3592FF96-8AEC-47B4-8581-4AC78DF523BB}.png",
      icon: <Calculator className="w-6 h-6" />,
      features: ["Black-76 Model", "Monte Carlo 1000+", "Greeks Calculation", "15+ Instruments"],
      path: "/pricers"
    },
    {
      title: "Advanced Commodity Market Data",
      description: "Market data center with professional widgets, real-time screeners, and 26+ commodities across Energy, Metals, Agriculture and Livestock. Custom commodity tracking, advanced filtering by volatility and performance, with automatic price updates via multi-source APIs for 24/7 global coverage.",
      image: "/landing-page/{75261304-660E-49FD-8593-8A2457028C93}.png",
      icon: <Globe className="w-6 h-6" />,
      features: ["26+ Commodities", "Custom Tracking", "Real-time Screeners", "Multi-Source APIs"],
      path: "/commodity-market"
    },
    {
      title: "Intelligent Strategy Builder",
      description: "Sophisticated strategy constructor enabling creation of complex structures: barriers (knock-in/out, double barriers), digitals (one-touch, range binary), and zero-cost strategies. Historical backtesting, risk matrix analysis, and automatic export to hedging instruments with complete validation.",
      image: "/landing-page/{7B73D666-4969-49FF-BFC7-DC561CC90246}.png",
      icon: <BarChart3 className="w-6 h-6" />,
      features: ["Barrier Options", "Zero-Cost Strategies", "Risk Matrix Analysis", "Historical Backtesting"],
      path: "/strategy-builder"
    },
    {
      title: "Executive Risk Dashboard",
      description: "Executive dashboard with advanced risk metrics: multi-commodity VaR, hedge ratios, unhedged exposures with automatic alerts. Real-time monitoring of major commodities (WTI, Brent, Gold, Copper) across Energy, Metals, Agriculture and Livestock with live/pause toggle to control data flows.",
      image: "/landing-page/{D5CFFF7D-7606-4F9D-BC9E-070AB4022E25}.png",
      icon: <FileText className="w-6 h-6" />,
      features: ["Multi-Commodity VaR", "Hedge Ratio Tracking", "Real-time Alerts", "Major Commodities Monitor"],
      path: "/dashboard"
    }
  ];

  const stats = [
    { value: "€50B+", label: "Hedged Volume" },
    { value: "500+", label: "Enterprise Clients" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <LandingNav />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div id="hero-background" className="absolute inset-0 z-0 parallax-bg">
          <AnimatedBackground />
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 via-slate-900/50 to-purple-900/60 z-10"></div>
        
        {/* Hero Content */}
        <div className="relative z-20 text-center max-w-6xl mx-auto px-6 hero-content">
          <Badge className="mb-6 bg-blue-500/20 text-blue-300 border-blue-400/30 px-4 py-2 text-sm">
            Next-Generation Commodity Risk Management
          </Badge>
          
          <h1 className="hero-title text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Master Your
            <span className="gradient-text">
              {" "}Commodity Risk
            </span>
          </h1>
          
          <p className="hero-subtitle text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed max-w-4xl mx-auto">
            Intelligent risk management platform that protects your business from commodity price volatility 
            with automated hedging strategies, real-time analytics, and enterprise-grade security.
          </p>
          
          <div className="hero-buttons flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="cta-primary text-white px-8 py-4 rounded-full text-lg font-semibold shadow-2xl hover:shadow-blue-500/25"
              onClick={() => window.location.href = '/login?mode=signup'}
            >
              Start Hedging Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="cta-secondary text-white px-8 py-4 rounded-full text-lg font-semibold"
              onClick={() => window.location.href = '/login?mode=login'}
            >
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="hero-stats grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-white/20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="stat-value text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-400 text-sm uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Showcase */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-20">
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                Platform Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                Complete Platform for
                <span className="text-blue-600"> Commodity Risk Management</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Advanced pricing engine, real-time market data, sophisticated strategy builder, and executive dashboard for optimal commodity risk management across Energy, Metals, Agriculture and Livestock
              </p>
            </div>
          </ScrollReveal>
          
          <div className="space-y-20">
            {features.map((feature, index) => (
              <ScrollReveal 
                key={index} 
                delay={index * 200}
                direction={index % 2 === 0 ? 'left' : 'right'}
              >
                <div className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
                  {/* Image Section */}
                  <div className="flex-1 w-full">
                    <Card className="feature-card group overflow-hidden border-0 shadow-2xl bg-white">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 relative">
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9Ijc0MCIgaGVpZ2h0PSIzOTAiIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0U1RTdFQiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxyZWN0IHg9IjYwIiB5PSI4MCIgd2lkdGg9IjY4MCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGOUZBRkIiLz4KPHBhdGggZD0iTTEwMCAzMDBMMTUwIDI1MEwyMDAgMjgwTDI1MCAyMDBMMzAwIDI0MEwzNTAgMTgwTDQwMCAyMjBMNDUwIDE2MEw1MDAgMjAwTDU1MCAxNDBMNjAwIDE4MEw2NTAgMTIwTDcwMCAxNjAiIHN0cm9rZT0iIzM5OEJGNiIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjQwMCIgY3k9IjIyNSIgcj0iODAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIzNzAiIHk9IjE5NSIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjM0I4MkY2Ij4KPC9zdmc+Cjx0ZXh0IHg9IjQwMCIgeT0iMzYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjU3Mzg0IiBmb250LXNpemU9IjE4IiBmb250LWZhbWlseT0iSW50ZXIiPkZYIFJpc2sgTWFuYWdlbWVudCBQbGF0Zm9ybTwvdGV4dD4KPHN2ZyB4PSIzNzAiIHk9IjE5NSIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIj4KPHBhdGggZD0iTTEwIDQwaDQwdjEwSDE1djI1aDI1djEwSDE1djI1aDM1djEwSDEwVjQweiIgZmlsbD0iIzM5OEJGNiIvPgo8L3N2Zz4KPC9zdmc+';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* Content Section */}
                  <div className="flex-1 w-full">
                    <div className="lg:px-8">
                      <div className="flex items-center mb-6">
                        <div className="feature-icon p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl text-blue-600 mr-6 shadow-lg">
                          {feature.icon}
                        </div>
                        <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                          Feature {index + 1}
                        </div>
                      </div>
                      
                      <h3 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                        {feature.title}
                      </h3>
                      
                      <p className="text-lg text-slate-600 leading-relaxed mb-8">
                        {feature.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        {feature.features.map((item, idx) => (
                          <div key={idx} className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-700">{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                      >
                        {index === 0 && "Explore Pricers"}
                        {index === 1 && "Explore Market Data"}
                        {index === 2 && "Explore Strategy Builder"}
                        {index === 3 && "Explore Dashboard"}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="testimonials" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-400/30">
                Trusted by Industry Leaders
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Join Thousands of Companies
                <span className="text-blue-400"> Managing Risk Better</span>
              </h2>
            </div>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollReveal key={index} delay={index * 150}>
                <Card className="testimonial-card bg-slate-800 border-slate-700 transition-all duration-300 h-full">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-slate-300 mb-6 leading-relaxed flex-grow">"{testimonial.content}"</p>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-slate-400">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                Frequently Asked Questions
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                Got Questions? We Have Answers
              </h2>
            </div>
          </ScrollReveal>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="faq-item border-slate-200">
                  <CardContent className="p-0">
                    <button
                      className="w-full text-left p-6 focus:outline-none"
                      onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-slate-900 pr-8">{faq.question}</h3>
                        {activeFAQ === index ? (
                          <ChevronUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                    {activeFAQ === index && (
                      <div className="px-6 pb-6">
                        <p className="faq-answer text-slate-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center px-6">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Risk Management?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join industry leaders who trust FX hedging for their currency risk management
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                onClick={() => window.location.href = '/login?mode=signup'}
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white/10 px-8 py-4 rounded-full text-lg font-semibold backdrop-blur-sm"
                onClick={() => window.location.href = '/login?mode=login'}
              >
                Schedule Demo
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                FX hedging
              </h3>
              <p className="text-slate-400 mb-6">
                Risk Management Platform
              </p>
              <p className="text-slate-400 leading-relaxed">
                Intelligent forex hedging solutions for enterprise risk management.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">News</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Legal Notice</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 mb-4 md:mb-0">
              © 2024 FX hedging - Risk Management Platform. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
