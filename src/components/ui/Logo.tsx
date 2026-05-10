import { cn } from "./cn";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizes = {
    sm: { icon: "w-6 h-6", text: "text-base", ring: "w-5 h-5" },
    md: { icon: "w-8 h-8", text: "text-xl", ring: "w-6 h-6" },
    lg: { icon: "w-12 h-12", text: "text-3xl", ring: "w-9 h-9" },
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("relative flex items-center justify-center", sizes[size].icon)}>
        <div className="absolute inset-0 rounded-full border-2 border-[#7c6af5] opacity-30 animate-ping" />
        <div className={cn("rounded-full border-2 border-[#7c6af5] flex items-center justify-center", sizes[size].ring)}>
          <div className="w-1/3 h-1/3 rounded-full bg-[#7c6af5]" />
        </div>
      </div>
      {showText && (
        <span className={cn("font-semibold tracking-tight text-[#f0f0f5]", sizes[size].text)}>
          Loop
        </span>
      )}
    </div>
  );
}
