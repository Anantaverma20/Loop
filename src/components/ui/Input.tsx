import { cn } from "./cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#c0c0d8]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full bg-[#1a1a28] border border-[#1e1e2e] text-[#f0f0f5] placeholder-[#6b6b8a]",
          "rounded-xl px-4 py-3 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-[#7c6af5] focus:border-transparent",
          "transition-all duration-200",
          error && "border-red-500/50 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-[#6b6b8a]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#c0c0d8]"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "w-full bg-[#1a1a28] border border-[#1e1e2e] text-[#f0f0f5] placeholder-[#6b6b8a]",
          "rounded-xl px-4 py-3 text-sm resize-none",
          "focus:outline-none focus:ring-2 focus:ring-[#7c6af5] focus:border-transparent",
          "transition-all duration-200",
          error && "border-red-500/50 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-[#6b6b8a]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
