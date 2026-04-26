import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { BRAND } from "@/constants/branding";
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

const RequestAccess: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<FormState>(DEFAULT_STATE);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitOk, setSubmitOk] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const productOptions = useMemo(
    () => [
      "Commodity Pricing",
      "FX Pricing",
      "Hedging & Exposures",
      "Strategy Builder",
      "Market Intelligence",
      "Supply Chain Monitoring",
    ],
    []
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitOk(false);

    if (!state.fullName.trim() || !state.email.trim() || !state.company.trim()) {
      setSubmitError("Please fill in Full name, Email, and Company.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("request-access", {
        body: state,
      });
      if (error) {
        setSubmitError(error.message || "Failed to send request.");
        return;
      }
      setSubmitOk(true);
      setState(DEFAULT_STATE);
    } catch {
      setSubmitError("Failed to send request. Please try again.");
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

      <div className="relative mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-5 inline-flex w-fit items-center font-headline text-xs font-bold uppercase tracking-wider text-[#c1caaf] hover:text-white sm:mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </button>

        <div className="landing-glass-card overflow-hidden rounded-sm border border-[#424a35]/25 bg-[#141b2b]/70 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-[#424a35]/15 p-5 sm:p-6 md:p-8">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] shadow-lg shadow-[#aef833]/20 sm:h-14 sm:w-14"
                aria-hidden
              >
                <span className="font-headline text-lg font-black text-[#213600] sm:text-xl">{BRAND.logoMark}</span>
              </div>
              <div className="min-w-0">
                <h1 className="font-headline text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">Request access</h1>
                <p className="mt-1 text-sm text-[#c1caaf]">
                  Tell us about your company and needs. We&apos;ll send this request directly to{" "}
                  <span className="break-all font-bold text-white">commohedge@gmail.com</span>.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="p-5 sm:p-6 md:p-8">
            {submitOk ? (
              <div className="mb-6 rounded-sm border border-[#aef833]/30 bg-[#0b1a0b]/40 px-4 py-3 text-sm text-[#dce2f7]">
                Request sent. We&apos;ll get back to you shortly.
              </div>
            ) : null}
            {submitError ? (
              <div className="mb-6 rounded-sm border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {submitError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="fullName">
                  Full name *
                </label>
                <input
                  id="fullName"
                  value={state.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="email">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c947b]" />
                  <input
                    id="email"
                    type="email"
                    value={state.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] pl-10 pr-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  value={state.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="+33 …"
                />
              </div>

              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="company">
                  Company *
                </label>
                <input
                  id="company"
                  value={state.company}
                  onChange={(e) => setField("company", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="Company name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="website">
                  Website
                </label>
                <input
                  id="website"
                  value={state.website}
                  onChange={(e) => setField("website", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="https://…"
                />
              </div>

              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="country">
                  Country
                </label>
                <input
                  id="country"
                  value={state.country}
                  onChange={(e) => setField("country", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="Country / region"
                />
              </div>

              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="role">
                  Role / title
                </label>
                <input
                  id="role"
                  value={state.role}
                  onChange={(e) => setField("role", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="Risk manager, Treasurer…"
                />
              </div>

              <div className="space-y-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="companySize">
                  Company size
                </label>
                <select
                  id="companySize"
                  value={state.companySize}
                  onChange={(e) => setField("companySize", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
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
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="industry">
                  Industry
                </label>
                <input
                  id="industry"
                  value={state.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="Energy, Metals, Agriculture, Manufacturing…"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="activity">
                  Activity (what do you do?)
                </label>
                <textarea
                  id="activity"
                  value={state.activity}
                  onChange={(e) => setField("activity", e.target.value)}
                  className="min-h-[88px] w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 py-2 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="E.g. physical trading, procurement, manufacturing exposure, shipping…"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <p className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]">Products interested</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {productOptions.map((opt) => {
                    const checked = state.products.includes(opt);
                    return (
                      <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-sm border border-[#424a35]/20 bg-[#070e1d]/40 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked ? [...state.products, opt] : state.products.filter((x) => x !== opt);
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

              <div className="space-y-2 md:col-span-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="hedgingHorizon">
                  Hedging horizon
                </label>
                <select
                  id="hedgingHorizon"
                  value={state.hedgingHorizon}
                  onChange={(e) => setField("hedgingHorizon", e.target.value)}
                  className="h-11 w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                >
                  <option value="">Select…</option>
                  <option value="Spot / very short term">Spot / very short term</option>
                  <option value="1–3 months">1–3 months</option>
                  <option value="3–12 months">3–12 months</option>
                  <option value="1–3 years">1–3 years</option>
                  <option value="3+ years">3+ years</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="font-headline text-xs font-bold uppercase tracking-wide text-[#c1caaf]" htmlFor="message">
                  Anything else?
                </label>
                <textarea
                  id="message"
                  value={state.message}
                  onChange={(e) => setField("message", e.target.value)}
                  className="min-h-[120px] w-full rounded-sm border border-[#424a35]/40 bg-[#070e1d] px-3 py-2 text-white placeholder:text-[#8c947b]/80 focus:outline-none focus:ring-2 focus:ring-[#aef833]/40"
                  placeholder="Volumes, instruments, desired start date, data feeds, constraints…"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-xs text-[#8c947b]">Sent via Supabase Edge Function.</p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="landing-btn-industrial landing-industrial-gradient inline-flex w-full items-center justify-center rounded-sm px-6 py-3 font-headline text-sm font-bold uppercase tracking-widest text-[#213600] hover:brightness-110 sm:w-auto sm:px-8"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center font-headline text-[10px] uppercase tracking-widest text-[#424a35]">{BRAND.copyrightLine}</p>
      </div>
    </div>
  );
};

export default RequestAccess;

