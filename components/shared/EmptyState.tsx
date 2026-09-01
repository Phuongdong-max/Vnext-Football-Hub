import React from 'react';

interface EmptyStateProps {
  /** Icon 28px từ bộ icon của app — không dùng emoji. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Hành động giúp người dùng thoát khỏi trạng thái rỗng. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Trạng thái rỗng theo design system VNEXT: icon, một câu nói rõ vì sao trống,
 * và lối thoát. Đây là màn hình duy nhất được phép căn giữa toàn bộ nội dung.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 ${className}`}
  >
    {icon && (
      <span className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary [&_svg]:w-7 [&_svg]:h-7">
        {icon}
      </span>
    )}
    <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
    {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-[42ch]">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Khung xương của một thẻ trận đấu — đúng số dòng và chiều rộng của nội dung thật. */
export const MatchCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-orange-sm" aria-hidden="true">
    <div className="flex items-center justify-between">
      <div className="skeleton-shimmer h-3 w-24" />
      <div className="skeleton-shimmer h-5 w-16 rounded-full" />
    </div>
    <div className="mt-6 flex flex-col items-center gap-2">
      <div className="skeleton-shimmer h-5 w-40" />
      <div className="skeleton-shimmer h-3 w-8" />
      <div className="skeleton-shimmer h-5 w-36" />
    </div>
    <div className="mt-6 space-y-2">
      <div className="skeleton-shimmer h-3 w-28" />
      <div className="skeleton-shimmer h-3 w-24" />
    </div>
    <div className="mt-5 skeleton-shimmer h-10 w-full rounded-md" />
  </div>
);

/** Lưới skeleton dùng cho danh sách trận đấu. */
export const MatchCardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }, (_, i) => (
      <MatchCardSkeleton key={i} />
    ))}
  </div>
);
