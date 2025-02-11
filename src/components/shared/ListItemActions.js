import React from 'react';
import PropTypes from 'prop-types';
import IconButton from './IconButton';

const ListItemActions = ({
  onEdit,
  onDelete,
  className = '',
  editIcon = '✏️',
  deleteIcon = '🗑️'
}) => {
  return (
    <div className={`tw-flex tw-items-center tw-space-x-2 ${className}`}>
      {onEdit && (
        <IconButton
          icon={editIcon}
          label="Edit"
          variant="ghost"
          size="small"
          onClick={onEdit}
        />
      )}
      
      {onDelete && (
        <IconButton
          icon={deleteIcon}
          label="Delete"
          variant="ghost"
          size="small"
          onClick={onDelete}
        />
      )}
    </div>
  );
};

ListItemActions.propTypes = {
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  className: PropTypes.string,
  editIcon: PropTypes.node,
  deleteIcon: PropTypes.node
};

export default ListItemActions; 