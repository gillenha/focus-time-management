import React from 'react';
import PropTypes from 'prop-types';

const ActionButton = ({
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const baseClasses = 'tw-rounded-md tw-font-medium tw-transition-all tw-duration-200 tw-ease-in-out';
  
  const variantClasses = {
    primary: 'tw-bg-blue-600 tw-text-white hover:tw-bg-blue-700',
    secondary: 'tw-bg-gray-600 tw-text-white hover:tw-bg-gray-700',
    danger: 'tw-bg-red-600 tw-text-white hover:tw-bg-red-700',
    ghost: 'tw-bg-transparent tw-text-gray-700 hover:tw-bg-gray-100',
  };

  const sizeClasses = {
    small: 'tw-px-2 tw-py-1 tw-text-sm',
    medium: 'tw-px-4 tw-py-2',
    large: 'tw-px-6 tw-py-3 tw-text-lg',
  };

  const disabledClasses = disabled ? 'tw-opacity-50 tw-cursor-not-allowed' : 'tw-cursor-pointer';

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

ActionButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default ActionButton; 