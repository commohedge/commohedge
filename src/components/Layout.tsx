import React, { useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { 
  SidebarInset, 
  SidebarProvider, 
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCompanySettings, getCompanyNameSync, companySettingsEmitter } from "@/hooks/useCompanySettings";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelLeftClose } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

function SidebarToggleButton() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="relative -ml-1 h-9 w-9 hover:bg-accent transition-all"
      title={open ? "Hide Sidebar" : "Show Sidebar"}
      aria-label={open ? "Hide Sidebar" : "Show Sidebar"}
    >
      {open ? (
        <PanelLeftClose className="h-4 w-4" />
      ) : (
        <PanelLeft className="h-4 w-4" />
      )}
      <span className="sr-only">{open ? "Hide Sidebar" : "Show Sidebar"}</span>
    </Button>
  );
}

export function Layout({ children, title, breadcrumbs }: LayoutProps) {
  const { getCompanyLogo } = useCompanySettings();
  const logo = getCompanyLogo();
  // Utilise le cache mémoire pour le nom dès le premier render
  const [companyName, setCompanyName] = useState(getCompanyNameSync());
  useEffect(() => {
    const unsubscribe = companySettingsEmitter.subscribe(() => {
      setCompanyName(getCompanyNameSync());
    });
    return unsubscribe;
  }, []);
  // Découpe le nom pour l'affichage
  const dashIndex = companyName.indexOf(' - ');
  const primaryName = dashIndex === -1 ? companyName : companyName.substring(0, dashIndex).trim();
  const secondaryName = dashIndex === -1 ? '' : companyName.substring(dashIndex + 3).trim();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:h-16">
          <div className="flex w-full min-w-0 items-center gap-2 px-2 sm:px-4">
            <SidebarToggleButton />
            <Separator orientation="vertical" className="mr-1 hidden h-4 sm:mr-2 sm:block" />
            {breadcrumbs && (
              <Breadcrumb className="min-w-0">
                <BreadcrumbList>
                  {breadcrumbs.map((breadcrumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <React.Fragment key={index}>
                        <BreadcrumbItem
                          className={isLast ? "min-w-0 truncate" : "hidden md:block"}
                        >
                          {breadcrumb.href ? (
                            <BreadcrumbLink href={breadcrumb.href} className="truncate">
                              {breadcrumb.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage className="truncate text-sm font-semibold sm:text-base">
                              {breadcrumb.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            )}
            {title && !breadcrumbs && (
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</h1>
            )}
            <div className="flex-1" />
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-[#0c1322]">
                <img 
                  src={logo}
                  alt="Company Logo" 
                  className="h-5 w-5 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/commohedge-logo.png";
                  }}
                />
              </span>
              <span className="font-medium">
                <span className="text-primary">{primaryName}</span>
                {secondaryName && <span className="text-muted-foreground"> &nbsp;| {secondaryName}</span>}
              </span>
            </div>
          </div>
        </header>
        <ScrollArea variant="content" orientation="both" className="flex-1">
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 pt-4 sm:gap-4 sm:p-4 sm:pt-6">
            {children}
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
} 