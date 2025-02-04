import React, { useState } from 'react';
import PropTypes from 'prop-types';
import IconButton from './IconButton';
import ConfirmDialog from './ConfirmDialog';

const ListItemActions = ({
  onEdit,
  onDelete,
  deleteConfirmTitle = 'Confirm Delete',
  deleteConfirmMessage = 'Are you sure you want to delete this item?',
  showLabels = false,
  className = '',
  editIcon = '✏️',
  deleteIcon = '🗑️'
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className={`tw-flex tw-items-center tw-space-x-2 ${className}`}>
      {onEdit && (
        <IconButton
          icon={editIcon}
          label="Edit"
          showLabel={showLabels}
          variant="ghost"
          size="small"
          onClick={onEdit}
        />
      )}
      
      {onDelete && (
        <>
          <IconButton
            icon={deleteIcon}
            label="Delete"
            showLabel={showLabels}
            variant="ghost"
            size="small"
            onClick={() => setShowDeleteConfirm(true)}
          />
          
          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={onDelete}
            title={deleteConfirmTitle}
            message={deleteConfirmMessage}
          />
        </>
      )}
    </div>
  );
};

ListItemActions.propTypes = {
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  deleteConfirmTitle: PropTypes.string,
  deleteConfirmMessage: PropTypes.string,
  showLabels: PropTypes.bool,
  className: PropTypes.string,
  editIcon: PropTypes.node,
  deleteIcon: PropTypes.node
};

export default ListItemActions; 