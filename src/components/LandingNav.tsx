import React, { useMemo, useRef, useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { BRAND } from "@/constants/branding";

const navLinks: { name: string; href: string; external?: boolean }[] = [
  { name: "Markets", href: "/commodity-market", external: true },
  { name: "Pricers", href: "/pricers", external: true },
  { name: "Platform", href: "#risk-architect" },
  { name: "Strategy", href: "/strategy-builder", external: true },
  { name: "FAQ", href: "#faq" },
];

const LandingNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const productsWrapRef = useRef<HTMLDivElement | null>(null);

  const products = useMemo(
    () => [
      { name: "Supply Chain", href: "https://supply-chain-management.commohedge.com/" },
      { name: "World Watcher", href: "https://world-watcher.vercel.app/" },
      { name: "FX Terminal", href: "https://fx.commohedge.com/" },
    ],
    []
  );

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProductsOpen(false);
  }, [location.pathname]);

  const go = (href: string, external?: boolean) => {
    setIsMobileMenuOpen(false);
    if (external) {
      navigate(href);
      return;
    }
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const wrap = productsWrapRef.current;
      if (!wrap) return;
      if (e.target instanceof Node && !wrap.contains(e.target)) setIsProductsOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <nav className="fixed left-1/2 top-0 z-50 flex w-full max-w-[1920px] -translate-x-1/2 items-center justify-between border-b border-[#424a35]/20 bg-[#0c1322]/80 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4 md:px-12 md:py-5">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex min-w-0 items-center gap-2 text-left sm:gap-3"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] shadow-md shadow-[#aef833]/25 sm:h-10 sm:w-10"
          aria-hidden
        >
          <span className="font-headline text-sm font-black text-[#213600]">{BRAND.logoMark}</span>
        </span>
        <span className="truncate font-headline text-lg font-black tracking-tight text-white sm:text-xl md:text-2xl">{BRAND.name}</span>
      </button>

      <div className="hidden items-center space-x-10 md:flex">
        {navLinks.map((link) => (
          <button
            key={link.name}
            type="button"
            onClick={() => go(link.href, link.external)}
            className="font-headline text-sm font-bold uppercase tracking-tight text-[#dce2f7] transition-colors hover:text-white"
          >
            {link.name}
          </button>
        ))}

        <div className="relative" ref={productsWrapRef}>
          <button
            type="button"
            onClick={() => setIsProductsOpen((v) => !v)}
            className="font-headline text-sm font-bold uppercase tracking-tight text-[#dce2f7] transition-colors hover:text-white"
            aria-haspopup="menu"
            aria-expanded={isProductsOpen}
          >
            Our Products
          </button>
          {isProductsOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-3 w-[220px] overflow-hidden rounded-sm border border-[#424a35]/30 bg-[#0c1322]/95 shadow-xl shadow-black/30 backdrop-blur-xl"
            >
              {products.map((p) => (
                <a
                  key={p.href}
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  className="block px-4 py-3 font-headline text-xs font-bold uppercase tracking-tight text-[#dce2f7] transition-colors hover:bg-white/5 hover:text-white"
                  onClick={() => setIsProductsOpen(false)}
                >
                  {p.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden items-center space-x-6 md:flex">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="font-headline text-sm font-bold uppercase tracking-tight text-[#dce2f7] transition-colors hover:text-white"
        >
          Client login
        </button>
        <button
          type="button"
          onClick={() => navigate("/login?mode=signup")}
          className="landing-btn-industrial bg-[#aef833] px-6 py-2 font-headline text-sm font-bold uppercase tracking-tight text-[#213600] transition-all duration-200 hover:scale-95"
        >
          Launch terminal
        </button>
      </div>

      <button
        type="button"
        className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#424a35]/30 bg-[#141b2b]/60 text-white md:hidden"
        aria-label="Menu"
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full max-h-[calc(100svh-3.5rem)] overflow-y-auto border-b border-[#424a35]/30 bg-[#0c1322] px-4 py-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:px-6 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <button
                key={link.name}
                type="button"
                onClick={() => go(link.href, link.external)}
                className="rounded-sm border border-transparent px-3 py-3 text-left font-headline text-[13px] font-bold uppercase tracking-[0.18em] text-white hover:border-[#424a35]/30 hover:bg-white/5"
              >
                {link.name}
              </button>
            ))}

            <div className="mt-2 rounded-sm border border-[#424a35]/20 bg-[#070e1d]/40 p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">Our Products</p>
                <span className="text-[10px] uppercase tracking-widest text-[#8c947b]">External</span>
              </div>
              <div className="flex flex-col gap-1">
                {products.map((p) => (
                  <a
                    key={p.href}
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm border border-transparent px-3 py-3 text-left font-headline text-[13px] font-bold uppercase tracking-[0.18em] text-white hover:border-[#424a35]/30 hover:bg-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {p.name}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/login");
                }}
                className="rounded-sm border border-[#424a35]/35 bg-[#141b2b]/60 px-3 py-3 text-center font-headline text-[13px] font-bold uppercase tracking-[0.18em] text-white"
              >
                Client login
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/login?mode=signup");
                }}
                className="landing-btn-industrial bg-[#aef833] py-3 text-center font-headline text-[13px] font-black uppercase tracking-[0.18em] text-[#213600]"
              >
                Launch terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNav;
