import React from 'react';

interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, label, checked, onChange, disabled = false }) => {
  return (
    <div className="flex items-center">
      <label htmlFor={id} className={`flex items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <div className="relative">
          <input
            id={id}
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(e) => !disabled && onChange(e.target.checked)}
            disabled={disabled}
          />
          <div className={`block ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-600'} w-14 h-8 rounded-full transition`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
        </div>
        <div className="ml-3 text-textPrimary font-medium">{label}</div>
      </label>
    </div>
  );
};
