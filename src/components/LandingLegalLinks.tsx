import { Link } from "react-router-dom";
import { openConsentPreferences } from "@/lib/landing-consent";

type Props = {
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
  showManage?: boolean;
};

const defaultLink =
  "font-headline text-[10px] uppercase tracking-widest text-[#8c947b] transition-colors hover:text-[#aef833]";

/**
 * Privacy · Cookies · Manage preferences — for landing / marketing footers.
 */
export function LandingLegalLinks({
  className = "flex flex-wrap items-center gap-x-3 gap-y-2",
  linkClassName = defaultLink,
  separatorClassName = "text-[#424a35]",
  showManage = true,
}: Props) {
  return (
    <nav aria-label="Legal" className={className}>
      <Link to="/privacy" className={linkClassName}>
        Privacy
      </Link>
      <span className={separatorClassName} aria-hidden>
        ·
      </span>
      <Link to="/cookies" className={linkClassName}>
        Cookies
      </Link>
      {showManage ? (
        <>
          <span className={separatorClassName} aria-hidden>
            ·
          </span>
          <button type="button" onClick={() => openConsentPreferences()} className={linkClassName}>
            Manage preferences
          </button>
        </>
      ) : null}
    </nav>
  );
}
