/** next/og 파비콘·애플 아이콘용. BrandMark와 같은 좌표. */
export function BrandMarkImage({ size }: { size: number }) {
  const k = size / 32;
  const top = 3.75 * k;
  const bottom = 4.3 * k;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#0c2340",
        display: "flex",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 11.2 * k - top,
          top: 10.2 * k - top,
          width: top * 2,
          height: top * 2,
          borderRadius: 999,
          border: `${Math.max(1, 1.7 * k)}px solid #f7f4ec`,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 19.4 * k,
          top: 6.2 * k,
          width: 2.8 * k,
          height: 10.4 * k,
          borderRadius: 1.3 * k,
          background: "#f7f4ec",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 13.6 * k - bottom,
          top: 23 * k - bottom,
          width: bottom * 2,
          height: bottom * 2,
          borderRadius: 999,
          border: `${Math.max(1, 1.8 * k)}px solid #e8c97a`,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
