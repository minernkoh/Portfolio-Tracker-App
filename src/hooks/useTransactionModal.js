// custom hook for managing transaction modal state
// reduces code duplication between Dashboard and AssetDetails

import { useState, useCallback } from 'react';
import { useAddTransaction, useUpdateTransaction } from './usePortfolio';

export function useTransactionModal(portfolioData = []) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();

  // open modal for adding a new transaction
  const openAddModal = useCallback((assetData = null) => {
    if (assetData) {
      // pre-fill with asset info (from table row or asset details page)
      setEditingTransaction({
        ticker: assetData.ticker || assetData,
        name: assetData.name,
        assetType: assetData.assetType,
        logo: assetData.logo,
        isNew: true,
      });
    } else {
      setEditingTransaction(null);
    }
    setIsFormOpen(true);
  }, []);

  // open modal for editing an existing transaction
  const openEditModal = useCallback((transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }, []);

  // close modal and reset state
  const closeModal = useCallback(() => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  }, []);

  // handle adding a new transaction
  const handleAddTransaction = useCallback(async (newTx) => {
    addTransaction.mutate(newTx);
  }, [addTransaction]);

  // handle updating an existing transaction
  const handleUpdateTransaction = useCallback(async (updatedTx) => {
    await updateTransaction.mutateAsync({
      id: updatedTx.id,
      data: updatedTx,
    });
  }, [updateTransaction]);

  // determine which handler to use based on editing state
  const isEditMode = !!(
    editingTransaction &&
    editingTransaction.id &&
    !editingTransaction.isNew
  );

  const handleSubmit = isEditMode ? handleUpdateTransaction : handleAddTransaction;

  return {
    isFormOpen,
    editingTransaction,
    isEditMode,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    isPending: addTransaction.isPending || updateTransaction.isPending,
    portfolioData,
  };
}

