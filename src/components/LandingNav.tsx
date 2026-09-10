import React, { useMemo, useRef, useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { BRAND } from "@/constants/branding";
import { BrandLogo } from "@/components/BrandLogo";

const navLinks: { name: string; href: string }[] = [
  { name: "Overview", href: "/#top" },
  { name: "Sectors", href: "/#verticals" },
  { name: "Oil", href: "/solutions/oil-energy" },
  { name: "Metals", href: "/solutions/metals-mining" },
  { name: "Agri", href: "/solutions/agriculture" },
  { name: "Platform", href: "/#risk-architect" },
  { name: "FAQ", href: "/#faq" },
  { name: "Contact", href: "/#contact" },
];

const scrollToHash = (hash: string) => {
  if (!hash.startsWith("#")) return;
  const el = document.querySelector(hash);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const LandingNav = () => {
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

  useEffect(() => {
    if (location.pathname !== "/") return;
    if (!location.hash) return;
    // Wait a tick so the landing DOM is ready after route changes
    const id = window.setTimeout(() => scrollToHash(location.hash), 0);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const wrap = productsWrapRef.current;
      if (!wrap) return;
      if (e.target instanceof Node && !wrap.contains(e.target)) setIsProductsOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const onHashNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hash = href.includes("#") ? `#${href.split("#")[1]}` : "";
    if (!hash) return;
    if (location.pathname === "/") {
      e.preventDefault();
      scrollToHash(hash);
      window.history.replaceState(null, "", hash);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed left-1/2 top-0 z-50 flex w-full max-w-[1920px] -translate-x-1/2 items-center justify-between border-b border-[#424a35]/20 bg-[#0c1322]/80 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4 md:px-12 md:py-5">
      <Link to="/" className="flex min-w-0 items-center gap-2 text-left sm:gap-3">
        <BrandLogo
          variant="dark"
          decorative
          className="h-9 w-9 shrink-0 rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] p-1.5 shadow-md shadow-[#aef833]/25 sm:h-10 sm:w-10 sm:p-2"
        />
        <span className="truncate font-headline text-lg font-black tracking-tight text-white sm:text-xl md:text-2xl">{BRAND.name}</span>
      </Link>

      <div className="hidden items-center space-x-10 md:flex">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            onClick={(e) => onHashNavClick(e, link.href)}
            className="font-headline text-sm font-bold uppercase tracking-tight text-[#dce2f7] transition-colors hover:text-white"
          >
            {link.name}
          </a>
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
        <Link
          to="/login"
          className="font-headline text-sm font-bold uppercase tracking-tight text-[#dce2f7] transition-colors hover:text-white"
        >
          Client login
        </Link>
        <Link
          to="/login?mode=signup"
          className="landing-btn-industrial bg-[#aef833] px-6 py-2 font-headline text-sm font-bold uppercase tracking-tight text-[#213600] transition-all duration-200 hover:scale-95"
        >
          Launch terminal
        </Link>
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
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => onHashNavClick(e, link.href)}
                className="rounded-sm border border-transparent px-3 py-3 text-left font-headline text-[13px] font-bold uppercase tracking-[0.18em] text-white hover:border-[#424a35]/30 hover:bg-white/5"
              >
                {link.name}
              </a>
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
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-sm border border-[#424a35]/35 bg-[#141b2b]/60 px-3 py-3 text-center font-headline text-[13px] font-bold uppercase tracking-[0.18em] text-white"
              >
                Client login
              </Link>
              <Link
                to="/login?mode=signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="landing-btn-industrial bg-[#aef833] py-3 text-center font-headline text-[13px] font-black uppercase tracking-[0.18em] text-[#213600]"
              >
                Launch terminal
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNav;
