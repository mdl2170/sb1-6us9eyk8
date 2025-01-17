import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getStrength = () => {
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character type checks
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
  };

  const strength = getStrength();
  const getColor = () => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getMessage = () => {
    if (strength <= 2) return 'Weak';
    if (strength <= 4) return 'Medium';
    return 'Strong';
  };

  const getWidth = () => {
    return `${Math.min((strength / 6) * 100, 100)}%`;
  };

  if (!password) return null;

  return (
    <div className="mt-1">
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: getWidth() }}
        />
      </div>
      <p className={`text-xs mt-1 ${getColor().replace('bg-', 'text-')}`}>
        {getMessage()} Password
      </p>
      <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
        <li className={password.length >= 8 ? 'text-green-500' : ''}>
          At least 8 characters
        </li>
        <li className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>
          One uppercase letter
        </li>
        <li className={/[a-z]/.test(password) ? 'text-green-500' : ''}>
          One lowercase letter
        </li>
        <li className={/[0-9]/.test(password) ? 'text-green-500' : ''}>
          One number
        </li>
        <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-500' : ''}>
          One special character
        </li>
      </ul>
    </div>
  );
}