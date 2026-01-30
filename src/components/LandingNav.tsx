import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingNav = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Testimonials', href: '#testimonials' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Contact', href: '#contact' }
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#C4D82E] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">CM</span>
            </div>
            <div>
              <div className={`font-bold text-lg transition-colors ${isScrolled ? 'text-black' : 'text-white'}`}>
                Commodity Risk
              </div>
              <div className={`text-xs transition-colors ${isScrolled ? 'text-gray-600' : 'text-gray-300'}`}>
                Risk Management Platform
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.name}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={`transition-colors duration-200 text-sm font-medium ${
                  isScrolled 
                    ? 'text-gray-700 hover:text-black' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              className={isScrolled ? 'text-gray-700 hover:text-black hover:bg-gray-100' : 'text-gray-300 hover:text-white hover:bg-white/10'}
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button 
              size="sm"
              className="bg-[#C4D82E] text-black hover:bg-[#B4C82E]"
              onClick={() => navigate('/login?mode=signup')}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 transition-colors ${isScrolled ? 'text-black' : 'text-white'}`}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className="block px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 transition-colors duration-200"
                >
                  {link.name}
                </a>
              ))}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-gray-700 hover:text-black hover:bg-gray-50"
                  onClick={() => {
                    navigate('/login');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Login
                </Button>
                <Button 
                  size="sm"
                  className="w-full bg-[#C4D82E] text-black hover:bg-[#B4C82E]"
                  onClick={() => {
                    navigate('/login?mode=signup');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default LandingNav;
