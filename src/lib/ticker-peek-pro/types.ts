export type ViewMode = "home" | "futures" | "options" | "volatility" | "volsurface" | "ivmatrix";

export interface Breadcrumb {
  label: string;
  view: ViewMode;
  symbol?: string;
}
