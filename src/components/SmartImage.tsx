import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Danh sách URL theo thứ tự ưu tiên. Nếu lỗi sẽ chuyển xuống URL kế tiếp. */
  sources: string[];
  /** Ảnh dự phòng cuối cùng (luôn dùng được, ví dụ ảnh hoạt hình bundled) */
  fallback: string;
  alt: string;
}

/**
 * Ảnh có cơ chế fallback nhiều lớp + skeleton loading.
 * Dùng cho ảnh thật (Unsplash) — nếu mạng yếu hoặc URL hỏng vẫn hiển thị được ảnh hoạt hình.
 */
export const SmartImage = ({ sources, fallback, alt, className, ...rest }: Props) => {
  const list = [...sources.filter(Boolean), fallback];
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIdx(0);
    setLoaded(false);
  }, [sources.join("|"), fallback]);

  return (
    <div className={cn("relative w-full h-full", className?.includes("rounded") ? "" : "")}>
      {!loaded && (
        <div className="absolute inset-0 rounded-[inherit] bg-muted animate-pulse" aria-hidden />
      )}
      <img
        {...rest}
        src={list[idx]}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (idx < list.length - 1) {
            setIdx(idx + 1);
            setLoaded(false);
          } else {
            setLoaded(true);
          }
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
};
