import React from 'react';

interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Công tắc theo token VNEXT: rãnh dùng `muted` khi tắt, gradient cam khi bật. */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, label, checked, onChange, disabled = false }) => {
  return (
    <div className="flex items-center">
      <label
        htmlFor={id}
        className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span className="relative inline-flex flex-shrink-0">
          <input
            id={id}
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => !disabled && onChange(e.target.checked)}
            disabled={disabled}
          />
          <span
            className={`block w-12 h-7 rounded-full border transition-colors duration-250 ease-spring
 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background
              ${checked ? 'btn-gradient border-transparent' : 'bg-muted border-border'}`}
          />
          <span
            className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-orange-sm transition-transform duration-250 ease-spring
              ${checked ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </label>
    </div>
  );
};
