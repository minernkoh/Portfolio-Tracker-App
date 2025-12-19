// reusable icon button component with variants
// consolidates edit, delete, and other icon-only buttons

import React from 'react';
import { PencilSimpleIcon, TrashIcon, PlusIcon, DotsThreeIcon, XIcon } from '@phosphor-icons/react';

const VARIANTS = {
  edit: {
    icon: PencilSimpleIcon,
    hoverColor: 'hover:text-[var(--text-primary)]',
    defaultTitle: 'Edit',
    weight: 'regular',
  },
  delete: {
    icon: TrashIcon,
    hoverColor: 'hover:text-red-500',
    defaultTitle: 'Delete',
    weight: 'regular',
  },
  add: {
    icon: PlusIcon,
    hoverColor: 'hover:text-[var(--text-primary)]',
    defaultTitle: 'Add',
    weight: 'bold',
  },
  more: {
    icon: DotsThreeIcon,
    hoverColor: 'hover:text-blue-400',
    defaultTitle: 'More options',
    weight: 'bold',
  },
  close: {
    icon: XIcon,
    hoverColor: 'hover:text-[var(--text-primary)]',
    defaultTitle: 'Close',
    weight: 'regular',
  },
};

export default function IconButton({
  variant = 'edit',
  onClick,
  disabled = false,
  title,
  size = 18,
  weight,
  className = '',
}) {
  const config = VARIANTS[variant];
  
  if (!config) {
    console.warn(`IconButton: unknown variant "${variant}"`);
    return null;
  }

  const Icon = config.icon;
  const buttonTitle = title || config.defaultTitle;
  const iconWeight = weight || config.weight;

  // check if className contains text color override, otherwise use default
  const hasTextColor = className.includes('text-');
  const defaultTextColor = hasTextColor ? '' : 'text-[var(--text-secondary)]';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 ${defaultTextColor} ${config.hoverColor} hover:bg-[var(--border-subtle)] rounded-md transition-colors disabled:opacity-50 ${className}`}
      title={buttonTitle}
    >
      <Icon size={size} weight={iconWeight} />
    </button>
  );
}

