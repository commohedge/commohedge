import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'sidebar' | 'content' | 'modal' | 'table' | 'list';
  orientation?: 'vertical' | 'horizontal' | 'both';
  smooth?: boolean;
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ 
    children, 
    className, 
    variant = 'default', 
    orientation = 'both',
    smooth = true,
    ...props 
  }, ref) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'sidebar':
          return 'sidebar-scrollbar';
        case 'content':
          return 'content-scrollbar';
        case 'modal':
          return 'modal-scrollbar';
        case 'table':
          return 'table-scroll';
        case 'list':
          return 'list-scrollbar';
        default:
          return 'smooth-scrollbar';
      }
    };

    const getOrientationClasses = () => {
      switch (orientation) {
        case 'vertical':
          return 'overflow-y-auto overflow-x-hidden';
        case 'horizontal':
          return 'overflow-x-auto overflow-y-hidden horizontal-scroll';
        case 'both':
        default:
          return 'overflow-auto';
      }
    };

    const classes = cn(
      getVariantClasses(),
      getOrientationClasses(),
      smooth && 'smooth-scroll',
      className
    );

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
export type { ScrollAreaProps };
