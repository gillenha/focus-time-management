import React from 'react';
import PropTypes from 'prop-types';
import ActionButton from './ActionButton';

const IconButton = ({
  icon,
  label,
  showLabel = false,
  iconPosition = 'left',
  ...props
}) => {
  const content = (
    <>
      {iconPosition === 'left' && icon}
      {(showLabel || props.variant === 'primary') && (
        <span className={`${!showLabel ? 'tw-sr-only' : 'tw-ml-2'}`}>{label}</span>
      )}
      {iconPosition === 'right' && icon}
    </>
  );

  return (
    <ActionButton
      {...props}
      className={`tw-inline-flex tw-items-center tw-justify-center ${props.className || ''}`}
    >
      {content}
    </ActionButton>
  );
};

IconButton.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  showLabel: PropTypes.bool,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  ...ActionButton.propTypes
};

export default IconButton; 