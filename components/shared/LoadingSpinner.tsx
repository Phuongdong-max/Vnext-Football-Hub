import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Lớp màu Tailwind, ví dụ `text-primary`, `text-white`. */
  color?: string;
}

/** Vòng quay dùng token VNEXT. Dành cho nút và vùng nhỏ; vùng nội dung dùng `Skeleton`. */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'text-primary',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
  };

  return (
    <span
      role="status"
      aria-label="Đang tải"
      className={`inline-block rounded-full border-current border-r-transparent animate-spin ${sizeClasses[size]} ${color} ${className}`}
    />
  );
};

/**
 * Khung xương khi đang tải. Phải giống khung nội dung thật (đúng số dòng, đúng
 * chiều rộng) — không phải mấy ô xám chung chung.
 */
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`skeleton-shimmer ${className}`} style={style} aria-hidden="true" />
);
