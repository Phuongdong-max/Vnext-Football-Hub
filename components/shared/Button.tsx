import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'outline' | 'ghost' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

/**
 * Nút theo design system VNEXT (vnext-ui/references/components.md).
 * Luật: mỗi cụm chỉ MỘT nút `primary` (cam). Hành động phụ dùng `outline`/`ghost`,
 * hành động lặp trong danh sách dùng `soft`.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium select-none ' +
    'transition-all duration-250 ease-spring ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background ' +
    'disabled:opacity-50 disabled:pointer-events-none';

  const variantStyles = {
    // Hành động chính — nền gradient deep để chữ trắng đạt 4.5:1
    primary: 'btn-gradient shadow-orange-sm hover:-translate-y-px hover:shadow-orange-md',
    // Hành động phụ
    outline: 'border border-border bg-card text-foreground hover:bg-primary/5 hover:border-primary/25',
    secondary: 'border border-border bg-card text-foreground hover:bg-primary/5 hover:border-primary/25',
    // Hành động lặp lại trong danh sách
    soft: 'bg-primary/10 text-vnext-deep dark:text-primary hover:bg-primary/[0.18]',
    ghost: 'text-foreground hover:bg-muted/60',
    danger: 'bg-destructive/10 text-danger-text hover:bg-destructive/20',
    warning: 'border border-warning/40 bg-warning/10 text-foreground hover:bg-warning/20',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs [&_svg]:w-4 [&_svg]:h-4',
    md: 'h-10 px-4 text-sm [&_svg]:w-4 [&_svg]:h-4',
    lg: 'h-11 px-6 text-base [&_svg]:w-5 [&_svg]:h-5',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
