export type ViewMode = "home" | "futures" | "options" | "volatility" | "volsurface";

export interface Breadcrumb {
  label: string;
  view: ViewMode;
  symbol?: string;
}
