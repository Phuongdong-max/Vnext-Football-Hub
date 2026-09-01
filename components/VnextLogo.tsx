import React from 'react';

/**
 * Logo VNEXT — xem skill vnext-ui/references/logo.md.
 *
 * Luật: không kéo méo, không xoay, không đổ bóng, không đặt trong khung tròn nền
 * cam. Chiều cao tối thiểu: mark 20px, khoá ngang 24px, khoá dọc 48px.
 */

/** Ngọn lửa VNEXT, inline SVG một khối — dùng được trên mọi nền, mọi cỡ ≤ 32px. */
export const VnextMark: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1000 1055"
    width={size}
    height={size}
    className={className}
    role="img"
    aria-label="VNEXT"
  >
    <defs>
      <linearGradient id="vnextFlame" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e96620" />
        <stop offset="55%" stopColor="#f5872b" />
        <stop offset="100%" stopColor="#f9b233" />
      </linearGradient>
    </defs>
    <path
      d="M322.9 1043.4C278.0 991.5 228.4 922.0 187.8 854.4C86.2 684.9 24.1 509.2 5.1 336.9C2.3 311.7 -0.5 277.5 0.2 276.9C0.4 276.7 9.3 282.4 20.0 289.5C42.1 304.4 75.2 324.6 104.4 341.0C127.6 354.0 181.2 381.7 181.8 381.1C182.0 380.8 182.5 353.1 182.9 319.4C183.6 259.9 184.2 246.5 188.2 201.9C193.9 137.6 207.8 52.0 220.1 4.7L221.4 -0.0L244.1 21.4C351.4 122.5 488.8 216.7 633.1 288.0C705.1 323.6 771.5 350.8 849.1 376.4C871.4 383.8 887.5 389.7 887.5 390.6C887.5 393.0 873.5 424.4 860.5 451.1C854.0 464.5 849.0 475.7 849.3 476.0C850.6 477.2 900.3 486.5 924.6 490.0C952.2 493.9 985.5 497.5 994.6 497.5C997.5 497.5 1000.0 497.9 1000.0 498.3C1000.0 500.3 982.5 532.3 970.3 552.5C857.3 740.8 695.5 889.2 493.8 989.9C455.1 1009.1 442.9 1014.6 406.2 1029.4C383.6 1038.5 345.3 1052.0 336.1 1054.2C333.2 1054.9 331.8 1053.7 322.9 1043.4Z"
      fill="url(#vnextFlame)"
    />
  </svg>
);

/**
 * Khoá logo đầy đủ (mark + chữ VNEXT). Nhúng bằng <img> nên phải chọn file theo
 * nền: bản thường cho theme sáng, bản `-light` (chữ trắng) cho theme tối.
 */
export const VnextLogo: React.FC<{
  variant?: 'horizontal' | 'stacked';
  height?: number;
  className?: string;
}> = ({ variant = 'horizontal', height = 28, className = '' }) => {
  const base = variant === 'horizontal' ? 'vnext-logo-horizontal' : 'vnext-logo';
  return (
    <>
      <img
        src={`/assets/vnext/${base}.svg`}
        alt="VNEXT"
        height={height}
        style={{ height, width: 'auto' }}
        className={`block dark:hidden ${className}`}
      />
      <img
        src={`/assets/vnext/${base}-light.svg`}
        alt="VNEXT"
        height={height}
        style={{ height, width: 'auto' }}
        className={`hidden dark:block ${className}`}
      />
    </>
  );
};

/**
 * Mark + tên sản phẩm — cách V-Sharing làm. Tên sản phẩm dùng Space Grotesk 700,
 * cách mark 10px, không viết hoa toàn bộ.
 */
export const VnextLockup: React.FC<{
  product: string;
  markSize?: number;
  className?: string;
}> = ({ product, markSize = 26, className = '' }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <VnextMark size={markSize} />
    <span className="font-heading font-bold tracking-tight text-foreground" style={{ fontSize: markSize * 0.72 }}>
      {product}
    </span>
  </span>
);
