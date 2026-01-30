import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LandingNav from "@/components/LandingNav";
import ScrollReveal from "@/components/ScrollReveal";
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
  Award
} from "lucide-react";
import "@/styles/landing-page.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

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

  // Main features with images
  const features = [
    {
      title: "Advanced Pricing Engine",
      description: "Sophisticated pricing engine utilizing Black-76 model for commodity options, forwards and swaps. Monte Carlo simulations with 1000+ scenarios, real-time Greeks calculations, and support for 15+ instrument types including barriers, digitals and exotic structures with cost of carry adjustments.",
      image: "/landing-page/{643F46F8-1E4F-42EC-80D5-6F11AFC3C863}.png",
      icon: <Calculator className="w-6 h-6" />,
      highlights: ["Black-76 Model", "Monte Carlo 1000+", "Greeks Calculation", "15+ Instruments"],
      path: "/pricers"
    },
    {
      title: "Commodity Market Data",
      description: "Market data center with professional widgets, real-time screeners, and 26+ commodities across Energy, Metals, Agriculture and Livestock. Custom commodity tracking, advanced filtering by volatility and performance, with automatic price updates via multi-source APIs for 24/7 global coverage.",
      image: "/landing-page/{907F8717-005A-4D82-A8EB-1297751D649D}.png",
      icon: <Globe className="w-6 h-6" />,
      highlights: ["26+ Commodities", "Custom Tracking", "Real-time Screeners", "Multi-Source APIs"],
      path: "/commodity-market"
    },
    {
      title: "Strategy Builder",
      description: "Sophisticated strategy constructor enabling creation of complex structures: barriers (knock-in/out, double barriers), digitals (one-touch, range binary), and zero-cost strategies. Historical backtesting, risk matrix analysis, and automatic export to hedging instruments with complete validation.",
      image: "/landing-page/{D85B4F5E-E1E0-46D1-859F-6225E4FEEC9B}.png",
      icon: <BarChart3 className="w-6 h-6" />,
      highlights: ["Barrier Options", "Zero-Cost Strategies", "Risk Matrix Analysis", "Historical Backtesting"],
      path: "/strategy-builder"
    },
    {
      title: "Risk Dashboard",
      description: "Executive dashboard with advanced risk metrics: multi-commodity VaR, hedge ratios, unhedged exposures with automatic alerts. Real-time monitoring of major commodities (WTI, Brent, Gold, Copper) across Energy, Metals, Agriculture and Livestock with live/pause toggle to control data flows.",
      image: "/landing-page/{DCD200B8-AD66-4EFE-A2F4-99B0B822210E}.png",
      icon: <FileText className="w-6 h-6" />,
      highlights: ["Multi-Commodity VaR", "Hedge Ratio Tracking", "Real-time Alerts", "Major Commodities Monitor"],
      path: "/dashboard"
    },
    {
      title: "Rate Explorer",
      description: "Comprehensive interest rate management with yield curve bootstrapping, government bonds analysis, and interest rate futures tracking. Advanced curve construction using multiple methods (Linear, Cubic Spline, Nelson-Siegel) for precise rate interpolation and discount factor calculations.",
      image: "/landing-page/{E5FFC7FA-3620-4616-9061-260F9BECE65D}.png",
      icon: <TrendingUp className="w-6 h-6" />,
      highlights: ["Yield Curve Bootstrapping", "Government Bonds", "Interest Rate Futures", "Multiple Interpolation Methods"],
      path: "/rate-explorer"
    }
  ];

  const stats = [
    { value: "€50B+", label: "Hedged Volume", icon: <DollarSign className="w-5 h-5" /> },
    { value: "500+", label: "Enterprise Clients", icon: <Users className="w-5 h-5" /> },
    { value: "99.9%", label: "Uptime", icon: <Activity className="w-5 h-5" /> },
    { value: "24/7", label: "Support", icon: <Clock className="w-5 h-5" /> }
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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <LandingNav />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #C4D82E 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-20 text-center max-w-6xl mx-auto px-6 py-32">
          <ScrollReveal delay={0}>
            <Badge className="mb-6 bg-[#C4D82E] text-black border-0 px-4 py-2 text-sm font-semibold">
              Next-Generation Commodity Risk Management
            </Badge>
          </ScrollReveal>
          
          <ScrollReveal delay={100}>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Master Your
              <span className="text-[#C4D82E] block mt-2">Commodity Risk</span>
            </h1>
          </ScrollReveal>
          
          <ScrollReveal delay={200}>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed max-w-4xl mx-auto">
              Intelligent risk management platform that protects your business from commodity price volatility 
              with automated hedging strategies, real-time analytics, and enterprise-grade security.
            </p>
          </ScrollReveal>
          
          <ScrollReveal delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button 
                size="lg" 
                className="bg-[#C4D82E] text-black hover:bg-[#B4C82E] px-8 py-6 rounded-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={() => navigate('/login?mode=signup')}
              >
                Start Hedging Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-black px-8 py-6 rounded-lg text-lg font-semibold transition-all duration-300"
                onClick={() => navigate('/login?mode=login')}
              >
                Watch Demo
              </Button>
            </div>
          </ScrollReveal>
          
          {/* Stats */}
          <ScrollReveal delay={400}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 border-t border-gray-800">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="flex items-center justify-center mb-3 text-[#C4D82E] group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#C4D82E] transition-colors duration-300">
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-[#C4D82E]" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-20">
              <Badge className="mb-4 bg-[#C4D82E]/10 text-black border-[#C4D82E] px-4 py-2">
                Platform Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
                Complete Platform for
                <span className="text-[#C4D82E]"> Commodity Risk Management</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Advanced pricing engine, real-time market data, sophisticated strategy builder, and executive dashboard for optimal commodity risk management across Energy, Metals, Agriculture and Livestock
              </p>
            </div>
          </ScrollReveal>
          
          <div className="space-y-32">
            {features.map((feature, index) => (
              <ScrollReveal 
                key={index} 
                delay={index * 150}
                direction={index % 2 === 0 ? 'left' : 'right'}
              >
                <div className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
                  {/* Image Section */}
                  <div className="flex-1 w-full">
                    <Card className="overflow-hidden border-2 border-gray-200 hover:border-[#C4D82E] transition-all duration-300 shadow-lg hover:shadow-2xl group">
                      <div className="aspect-video overflow-hidden bg-gray-100 relative">
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9Ijc0MCIgaGVpZ2h0PSIzOTAiIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0U1RTdFQiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iMjMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjU3Mzg0IiBmb250LXNpemU9IjI0IiBmb250LWZhbWlseT0iSW50ZXIiPkNvbW1vZGl0eSBSaXNrIE1hbmFnZW1lbnQ8L3RleHQ+Cjwvc3ZnPg==';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* Content Section */}
                  <div className="flex-1 w-full">
                    <div className="lg:px-8">
                      <div className="flex items-center mb-6">
                        <div className="p-4 bg-[#C4D82E] rounded-xl text-black mr-4 shadow-lg">
                          {feature.icon}
                        </div>
                        <div className="text-sm font-semibold text-[#C4D82E] uppercase tracking-wider">
                          Feature {index + 1}
                        </div>
                      </div>
                      
                      <h3 className="text-3xl lg:text-4xl font-bold text-black mb-6 leading-tight">
                        {feature.title}
                      </h3>
                      
                      <p className="text-lg text-gray-600 leading-relaxed mb-8">
                        {feature.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        {feature.highlights.map((item, idx) => (
                          <div key={idx} className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-[#C4D82E] flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="border-2 border-black text-black hover:bg-black hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                        onClick={() => navigate(feature.path)}
                      >
                        Explore {feature.title.split(' ')[0]}
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

      {/* Benefits Section */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-[#C4D82E] text-black border-0 px-4 py-2">
                Why Choose Us
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Enterprise-Grade
                <span className="text-[#C4D82E]"> Risk Management</span>
              </h2>
            </div>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="bg-gray-900 border-gray-800 hover:border-[#C4D82E] transition-all duration-300 h-full group">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 bg-[#C4D82E] rounded-lg flex items-center justify-center text-black mb-6 group-hover:scale-110 transition-transform duration-300">
                      {benefit.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">{benefit.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-[#C4D82E]/10 text-black border-[#C4D82E] px-4 py-2">
                Trusted by Industry Leaders
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
                Join Thousands of Companies
                <span className="text-[#C4D82E]"> Managing Risk Better</span>
              </h2>
            </div>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollReveal key={index} delay={index * 150}>
                <Card className="border-2 border-gray-200 hover:border-[#C4D82E] transition-all duration-300 h-full shadow-lg hover:shadow-xl">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-[#C4D82E] fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed flex-grow">"{testimonial.content}"</p>
                    <div>
                      <div className="font-semibold text-black">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-[#C4D82E]/10 text-black border-[#C4D82E] px-4 py-2">
                Frequently Asked Questions
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
                Got Questions? We Have Answers
              </h2>
            </div>
          </ScrollReveal>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="border-2 border-gray-200 hover:border-[#C4D82E] transition-all duration-300">
                  <CardContent className="p-0">
                    <button
                      className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-[#C4D82E] rounded-lg"
                      onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-black pr-8">{faq.question}</h3>
                        {activeFAQ === index ? (
                          <ChevronUp className="w-5 h-5 text-[#C4D82E] flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                    {activeFAQ === index && (
                      <div className="px-6 pb-6 animate-fadeIn">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
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
      <section className="py-24 bg-black">
        <div className="max-w-4xl mx-auto text-center px-6">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Risk Management?
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Join industry leaders who trust our platform for their commodity risk management
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-[#C4D82E] text-black hover:bg-[#B4C82E] px-8 py-6 rounded-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={() => navigate('/login?mode=signup')}
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-black px-8 py-6 rounded-lg text-lg font-semibold transition-all duration-300"
                onClick={() => navigate('/login?mode=login')}
              >
                Schedule Demo
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-black text-white py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-[#C4D82E]">
                Commodity Risk
              </h3>
              <p className="text-gray-400 mb-6">
                Risk Management Platform
              </p>
              <p className="text-gray-400 leading-relaxed">
                Intelligent commodity hedging solutions for enterprise risk management.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-[#C4D82E] transition-colors">Features</a></li>
                <li><a href="/pricers" className="hover:text-[#C4D82E] transition-colors">Pricing Engine</a></li>
                <li><a href="/commodity-market" className="hover:text-[#C4D82E] transition-colors">Market Data</a></li>
                <li><a href="/strategy-builder" className="hover:text-[#C4D82E] transition-colors">Strategy Builder</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#testimonials" className="hover:text-[#C4D82E] transition-colors">About</a></li>
                <li><a href="#testimonials" className="hover:text-[#C4D82E] transition-colors">Testimonials</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors">FAQ</a></li>
                <li><a href="#contact" className="hover:text-[#C4D82E] transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors">Documentation</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors">Help Center</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors">Privacy Policy</a></li>
                <li><a href="#faq" className="hover:text-[#C4D82E] transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              © 2024 Commodity Risk Management Platform. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#C4D82E] transition-colors">
                <Users className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#C4D82E] transition-colors">
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
