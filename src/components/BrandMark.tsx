type Props = {
  size?: number;
  className?: string;
};

/** 관리자 프로그램 마크. 탭 아이콘(icon.tsx)과 같은 형태. */
export function BrandMark({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="64"
    >
      <rect width="32" height="32" rx="6" fill="#0c2340" />
      <rect x="6" y="6" width="20" height="2.5" rx="1" fill="#d4b483" />
      <text
        x="16"
        y="23.5"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="15"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        64
      </text>
    </svg>
  );
}
