type Props = {
  size?: number;
  className?: string;
};

/** 잉 글자를 도형으로 줄인 마크. 파비콘과 같은 형태. */
export function BrandMark({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="잉잉관리자"
    >
      <rect width="32" height="32" rx="8" fill="#1a56db" />
      <circle cx="11.2" cy="10.2" r="3.75" fill="none" stroke="#ffffff" strokeWidth="1.7" />
      <rect x="19.4" y="6.2" width="2.8" height="10.4" rx="1.3" fill="#ffffff" />
      <circle cx="13.6" cy="23" r="4.3" fill="none" stroke="#e8a317" strokeWidth="1.8" />
    </svg>
  );
}
