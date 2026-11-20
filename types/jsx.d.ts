import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

// React 19 compatibility augmentation for Radix UI Dropdown Menu
declare module '@radix-ui/react-dropdown-menu' {
  interface DropdownMenuTriggerProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
  }
  interface DropdownMenuItemProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
  }
  interface DropdownMenuSubTriggerProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
  }
  interface DropdownMenuSubContentProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
  }
  interface DropdownMenuContentProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
  }
  interface DropdownMenuCheckboxItemProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
    checked?: boolean | 'indeterminate';
  }
  interface DropdownMenuRadioItemProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
  }
  interface DropdownMenuLabelProps {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
  }
  interface DropdownMenuSeparatorProps {
    children?: React.ReactNode;
    className?: string;
  }
}
