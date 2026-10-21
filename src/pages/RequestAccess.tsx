import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";
import { BRAND } from "@/constants/branding";
import { BrandLogo } from "@/components/BrandLogo";
import { LandingLegalLinks } from "@/components/LandingLegalLinks";
import { supabase } from "@/lib/supabase";
import "@/styles/landing-terminal.css";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  country: string;
  industry: string;
  activity: string;
  role: string;
  companySize: string;
  products: string[];
  hedgingHorizon: string;
  message: string;
};

const DEFAULT_STATE: FormState = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  website: "",
  country: "",
  industry: "",
  activity: "",
  role: "",
  companySize: "",
  products: [],
  hedgingHorizon: "",
  message: "",
};

const fieldClass =
  "h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 transition-colors focus:border-[#aef833]/40 focus:outline-none focus:ring-2 focus:ring-[#aef833]/25";
const labelClass = "font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-[#aeb5c5]";

const RequestAccess: React.FC = () => {
  const [state, setState] = useState<FormState>(DEFAULT_STATE);
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productOptions = useMemo(
    () => [
      "Commodity Pricing",
      "FX Pricing",
      "Hedging & Exposures",
      "Strategy Builder",
      "Market Intelligence",
      "Supply Chain Monitoring",
    ],
    [],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitOk(false);

    if (!state.fullName.trim() || !state.email.trim() || !state.company.trim()) {
      setSubmitError("Please complete the required fields: full name, work email and company.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("request-access", {
        body: state,
      });
      if (error) {
        setSubmitError(error.message || "We could not send your request. Please try again.");
        return;
      }
      setSubmitOk(true);
      setState(DEFAULT_STATE);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError("We could not send your request. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  return (
    <div className="landing-terminal-root dark relative min-h-screen overflow-hidden bg-[#0c1322] text-[#dce2f7]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-[#aef833]/10 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-[#93db04]/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "url(https://www.transparenttextures.com/patterns/carbon-fibre.png)",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
        <Link
          to="/"
          className="mb-6 inline-flex w-fit items-center font-headline text-xs font-bold uppercase tracking-wider text-[#c1caaf] transition-colors hover:text-white sm:mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Link>

        <div className="landing-glass-card overflow-hidden rounded-sm border border-[#424a35]/25 bg-[#141b2b]/70 backdrop-blur-xl">
          <div className="border-b border-[#424a35]/15 p-5 sm:p-7 md:p-8">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <BrandLogo
                variant="dark"
                decorative
                className="h-12 w-12 shrink-0 rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] p-2.5 sm:h-14 sm:w-14 sm:p-3"
              />
              <div className="min-w-0">
                <p className="mb-1 font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">
                  Desk onboarding
                </p>
                <h1 className="font-headline text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
                  Request access
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#c1caaf]">
                  Share a few details about your desk. Our team reviews every request and follows up
                  with next steps for a guided trial.
                </p>
              </div>
            </div>
          </div>

          {submitOk ? (
            <div className="p-5 sm:p-7 md:p-8">
              <div className="rounded-sm border border-[#aef833]/25 bg-[#0b1a0b]/50 px-5 py-8 text-center sm:px-8">
                <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-[#aef833]" aria-hidden />
                <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-white">
                  Request received
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#c1caaf]">
                  Thank you. We typically respond within one business day with access details or a short
                  call to scope your desk.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => setSubmitOk(false)}
                    className="landing-btn-industrial border border-[#424a35]/40 px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5"
                  >
                    Submit another request
                  </button>
                  <Link
                    to="/"
                    className="landing-btn-industrial landing-industrial-gradient inline-flex items-center justify-center px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#213600]"
                  >
                    Back to home
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="p-5 sm:p-7 md:p-8" noValidate>
              {submitError ? (
                <div
                  role="alert"
                  className="mb-6 rounded-sm border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100"
                >
                  {submitError}
                </div>
              ) : null}

              <section className="space-y-4">
                <h2 className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">
                  Contact
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="fullName">
                      Full name *
                    </label>
                    <input
                      id="fullName"
                      value={state.fullName}
                      onChange={(e) => setField("fullName", e.target.value)}
                      className={fieldClass}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="email">
                      Work email *
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c947b]" />
                      <input
                        id="email"
                        type="email"
                        value={state.email}
                        onChange={(e) => setField("email", e.target.value)}
                        className={`${fieldClass} pl-10`}
                        placeholder="you@company.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="phone">
                      Phone
                    </label>
                    <input
                      id="phone"
                      value={state.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      className={fieldClass}
                      placeholder="+33 …"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="role">
                      Role / title
                    </label>
                    <input
                      id="role"
                      value={state.role}
                      onChange={(e) => setField("role", e.target.value)}
                      className={fieldClass}
                      placeholder="Treasurer, Risk manager…"
                      autoComplete="organization-title"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-8 space-y-4 border-t border-[#424a35]/15 pt-8">
                <h2 className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">
                  Company
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="company">
                      Company *
                    </label>
                    <input
                      id="company"
                      value={state.company}
                      onChange={(e) => setField("company", e.target.value)}
                      className={fieldClass}
                      placeholder="Company name"
                      autoComplete="organization"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="website">
                      Website
                    </label>
                    <input
                      id="website"
                      value={state.website}
                      onChange={(e) => setField("website", e.target.value)}
                      className={fieldClass}
                      placeholder="https://…"
                      autoComplete="url"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="country">
                      Country
                    </label>
                    <input
                      id="country"
                      value={state.country}
                      onChange={(e) => setField("country", e.target.value)}
                      className={fieldClass}
                      placeholder="Country / region"
                      autoComplete="country-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="companySize">
                      Company size
                    </label>
                    <select
                      id="companySize"
                      value={state.companySize}
                      onChange={(e) => setField("companySize", e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Select…</option>
                      <option value="1-10">1–10</option>
                      <option value="11-50">11–50</option>
                      <option value="51-200">51–200</option>
                      <option value="201-1000">201–1,000</option>
                      <option value="1000+">1,000+</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className={labelClass} htmlFor="industry">
                      Industry
                    </label>
                    <input
                      id="industry"
                      value={state.industry}
                      onChange={(e) => setField("industry", e.target.value)}
                      className={fieldClass}
                      placeholder="Energy, metals, agriculture, manufacturing…"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className={labelClass} htmlFor="activity">
                      Business activity
                    </label>
                    <textarea
                      id="activity"
                      value={state.activity}
                      onChange={(e) => setField("activity", e.target.value)}
                      className="min-h-[88px] w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 py-2.5 text-white placeholder:text-[#8c947b]/80 transition-colors focus:border-[#aef833]/40 focus:outline-none focus:ring-2 focus:ring-[#aef833]/25"
                      placeholder="Physical trading, procurement, manufacturing exposure, shipping…"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-8 space-y-4 border-t border-[#424a35]/15 pt-8">
                <h2 className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">
                  Desk needs
                </h2>
                <div className="space-y-2">
                  <p className={labelClass}>Modules of interest</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {productOptions.map((opt) => {
                      const checked = state.products.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 transition-colors ${
                            checked
                              ? "border-[#aef833]/35 bg-[#aef833]/[0.06]"
                              : "border-[#424a35]/25 bg-[#070e1d]/50 hover:border-[#424a35]/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...state.products, opt]
                                : state.products.filter((x) => x !== opt);
                              setField("products", next);
                            }}
                            className="h-4 w-4 accent-[#aef833]"
                          />
                          <span className="text-sm text-[#dce2f7]">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass} htmlFor="hedgingHorizon">
                    Hedging horizon
                  </label>
                  <select
                    id="hedgingHorizon"
                    value={state.hedgingHorizon}
                    onChange={(e) => setField("hedgingHorizon", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select…</option>
                    <option value="Spot / very short term">Spot / very short term</option>
                    <option value="1–3 months">1–3 months</option>
                    <option value="3–12 months">3–12 months</option>
                    <option value="1–3 years">1–3 years</option>
                    <option value="3+ years">3+ years</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={labelClass} htmlFor="message">
                    Additional context
                  </label>
                  <textarea
                    id="message"
                    value={state.message}
                    onChange={(e) => setField("message", e.target.value)}
                    className="min-h-[120px] w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 py-2.5 text-white placeholder:text-[#8c947b]/80 transition-colors focus:border-[#aef833]/40 focus:outline-none focus:ring-2 focus:ring-[#aef833]/25"
                    placeholder="Volumes, instruments, target start date, data feeds, constraints…"
                  />
                </div>
              </section>

              <div className="mt-8 flex flex-col gap-4 border-t border-[#424a35]/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-xs leading-relaxed text-[#8c947b]">
                  Your information is used only to evaluate access and contact you about {BRAND.name}. We
                  do not sell lead data. See our{" "}
                  <Link to="/privacy" className="text-[#aef833] hover:underline">
                    Privacy policy
                  </Link>
                  .
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="landing-btn-industrial landing-industrial-gradient inline-flex w-full shrink-0 items-center justify-center px-8 py-3.5 font-headline text-sm font-bold uppercase tracking-widest text-[#213600] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending…" : "Submit request"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <LandingLegalLinks />
          <p className="text-center font-headline text-[10px] uppercase tracking-widest text-[#424a35]">
            {BRAND.copyrightLine}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RequestAccess;
