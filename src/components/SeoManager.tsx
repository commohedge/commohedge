import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyPageSeo, resolvePageSeo } from "@/seo/site-seo";

/** Keeps <title>, description, robots, canonical and OG tags in sync with the route. */
export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyPageSeo(resolvePageSeo(pathname));
  }, [pathname]);

  return null;
}
