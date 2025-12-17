// modal form for adding or editing transactions
// refactored to use reusable components and reduce verbosity

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { XIcon, CheckIcon, SpinnerGap } from "@phosphor-icons/react";
import { getStockLogo, fetchStockPrices, fetchCryptoPrices, getCryptoInfo } from "../services/api";
import { SEARCH_ASSETS, findAssetByTicker, searchAssets, getAssetsByType } from "../constants/assets";
import FormInput from "./ui/FormInput";
import AssetDropdown from "./ui/AssetDropdown";
import ToggleButtonGroup from "./ui/ToggleButtonGroup";

// default form state
const getDefaultFormData = () => ({
  type: "Buy",
  ticker: "",
  name: "",
  assetType: "stock",
  quantity: "",
  price: "",
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().slice(0, 5),
});

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEditMode = false,
  portfolioData = [],
}) {
  const [formData, setFormData] = useState(getDefaultFormData());
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPopularDropdown, setShowPopularDropdown] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isFetchingCryptoInfo, setIsFetchingCryptoInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    if (initialData && typeof initialData === "object") {
      const tickerValue = typeof initialData.ticker === "string" ? initialData.ticker : "";
      const match = findAssetByTicker(tickerValue);
      let assetTypeValue = initialData.assetType || (match ? match.type.toLowerCase() : "stock");
      if (typeof assetTypeValue === "string") assetTypeValue = assetTypeValue.toLowerCase();

      const isNewTransaction = initialData.isNew && !initialData.id;
      const hasPrice = initialData.price != null && initialData.price !== "";

      setFormData({
        type: initialData.type || "Buy",
        ticker: tickerValue,
        name: initialData.name || (match ? match.name : ""),
        assetType: assetTypeValue,
        logo: initialData.logo || (match ? match.logo : undefined),
        quantity: initialData.quantity != null ? String(initialData.quantity) : "",
        price: initialData.price != null ? formatPriceForDisplay(initialData.price) : "",
        date: initialData.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        time: initialData.time || new Date().toTimeString().slice(0, 5),
      });

      if (isNewTransaction && tickerValue && !hasPrice && !isEditMode) {
        fetchCurrentPrice(tickerValue, assetTypeValue === "crypto" ? "Crypto" : "Stock", false);
      }
    } else {
      setFormData(getDefaultFormData());
    }
    
    setSearchResults([]);
    setShowDropdown(false);
    setShowPopularDropdown(false);
    setErrors({});
  }, [isOpen, initialData, isEditMode]);

  // format price for display (2 decimals)
  const formatPriceForDisplay = (price) => {
    const num = parseFloat(price);
    return isNaN(num) ? String(price) : num.toFixed(2);
  };

  // fetch current market price
  const fetchCurrentPrice = useCallback(async (ticker, assetType, forceUpdate = false) => {
    if (!forceUpdate && formData.price?.trim()) return;
    
    setIsFetchingPrice(true);
    try {
      const fetchFn = assetType.toLowerCase() === "crypto" ? fetchCryptoPrices : fetchStockPrices;
      const prices = await fetchFn([ticker]);
      const priceData = prices[ticker];
      
      if (priceData?.currentPrice > 0) {
        setFormData(prev => {
          if (forceUpdate || !prev.price?.trim()) {
            return { ...prev, price: priceData.currentPrice.toString() };
          }
          return prev;
        });
      }
    } catch (error) {
      console.warn("Failed to fetch current price:", error);
    } finally {
      setIsFetchingPrice(false);
    }
  }, [formData.price]);

  // handle asset selection from dropdown
  const selectAsset = useCallback((asset) => {
    const tickerChanged = formData.ticker !== asset.ticker;
    
    setFormData(prev => ({
      ...prev,
      ticker: asset.ticker,
      name: asset.name,
      assetType: asset.type.toLowerCase(),
      logo: asset.type === "Stock" ? getStockLogo(asset.ticker) : asset.logo,
      price: tickerChanged ? "" : prev.price?.trim() || "",
    }));
    
    setShowDropdown(false);
    setShowPopularDropdown(false);
    setSearchResults([]);
    
    if (tickerChanged) {
      fetchCurrentPrice(asset.ticker, asset.type, true);
    } else if (!formData.price?.trim()) {
      fetchCurrentPrice(asset.ticker, asset.type, false);
    }
  }, [formData.ticker, formData.price, fetchCurrentPrice]);

  // clear selected asset
  const clearAsset = useCallback(() => {
    setFormData(prev => ({ ...prev, ticker: "", name: "", logo: undefined }));
    setSearchResults([]);
    setShowDropdown(false);
    setShowPopularDropdown(false);
  }, []);

  // handle ticker autofill on blur/enter
  const handleTickerAutofill = useCallback(async (tickerValue) => {
    if (!tickerValue?.trim() || isEditMode) return;

    const upperValue = tickerValue.toUpperCase().trim();
    const tickerChanged = formData.ticker !== upperValue;
    const existingPrice = !tickerChanged && formData.price?.trim() ? formData.price : "";
    
    const match = findAssetByTicker(upperValue);
    
    if (match) {
      setFormData(prev => ({
        ...prev,
        ticker: upperValue,
        name: match.name,
        assetType: match.type.toLowerCase(),
        logo: match.type === "Stock" ? getStockLogo(match.ticker) : match.logo,
        price: existingPrice,
      }));
      if (tickerChanged || !existingPrice) {
        fetchCurrentPrice(match.ticker, match.type, false);
      }
    } else {
      // no match - try to fetch based on current asset type
      const currentType = formData.assetType || "stock";
      
      if (currentType === "crypto") {
        setIsFetchingCryptoInfo(true);
        try {
          const cryptoInfo = await getCryptoInfo(upperValue);
          setFormData(prev => ({
            ...prev,
            ticker: upperValue,
            name: cryptoInfo?.name || upperValue,
            logo: cryptoInfo?.logo,
            assetType: "crypto",
            price: existingPrice,
          }));
        } catch {
          setFormData(prev => ({ ...prev, ticker: upperValue, assetType: "crypto", price: existingPrice }));
        } finally {
          setIsFetchingCryptoInfo(false);
        }
        if (tickerChanged || !existingPrice) fetchCurrentPrice(upperValue, "Crypto", false);
      } else {
        setFormData(prev => ({ ...prev, ticker: upperValue, assetType: "stock", price: existingPrice }));
        if (tickerChanged || !existingPrice) fetchCurrentPrice(upperValue, "Stock", false);
      }
    }
  }, [formData.ticker, formData.price, formData.assetType, isEditMode, fetchCurrentPrice]);

  // handle form field changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // clear field error
    if (errors[name]) {
      setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }

    if (name === "ticker") {
      const upperValue = value.toUpperCase();
      setFormData(prev => ({ ...prev, ticker: upperValue }));
      
      if (upperValue.length > 0 && !isEditMode) {
        const matches = searchAssets(upperValue, formData.assetType);
        setSearchResults(matches);
        setShowDropdown(true);
        setShowPopularDropdown(false);
      } else {
        setShowDropdown(false);
      }
    } else if (name === "assetType") {
      setFormData(prev => ({ ...prev, assetType: value, ticker: "", name: "", logo: undefined }));
      setSearchResults([]);
      setShowDropdown(false);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, [errors, isEditMode, formData.assetType]);

  // validate form
  const validateForm = useCallback(() => {
    const newErrors = {};
    const quantity = Number(formData.quantity);
    const price = Number(formData.price);

    if (!isEditMode) {
      if (!formData.assetType?.trim()) newErrors.assetType = "Asset type is required";
      if (!formData.ticker?.trim()) newErrors.ticker = "Ticker symbol is required";
      else if (formData.ticker.length > 10) newErrors.ticker = "Ticker symbol is too long";
    }

    if (!formData.quantity?.toString().trim()) newErrors.quantity = "Quantity is required";
    else if (isNaN(quantity) || quantity <= 0) newErrors.quantity = "Quantity must be a positive number";

    // check if selling more than owned
    if (formData.type === "Sell" && !isEditMode) {
      const asset = portfolioData.find(a => a.ticker === formData.ticker);
      if (quantity > (asset?.quantity || 0)) {
        newErrors.quantity = `You only own ${asset?.quantity || 0} ${formData.ticker}. Cannot sell more than you own.`;
      }
    }

    if (!formData.price?.toString().trim()) newErrors.price = "Price is required";
    else if (isNaN(price) || price < 0) newErrors.price = "Price must be a non-negative number";

    if (!formData.date) newErrors.date = "Date is required";
    else if (new Date(formData.date) > new Date()) newErrors.date = "Date cannot be in the future";

    if (!formData.time?.trim()) newErrors.time = "Time is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditMode, portfolioData]);

  // handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const finalName = formData.name || formData.ticker;
    const finalType = formData.assetType?.toLowerCase() === "crypto" ? "Crypto" : "Stock";

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        name: finalName,
        assetType: finalType,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
      };

      if ((isEditMode || initialData?.id) && initialData?.id) {
        submitData.id = initialData.id;
      }

      await onSubmit(submitData);
      setErrors({});
      setFormData(getDefaultFormData());
      onClose();
    } catch (error) {
      console.error("Submission failed", error);
      setErrors({ submit: error.message || "Failed to save transaction" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // calculate derived values for UI
  const asset = portfolioData.find(a => a.ticker === formData.ticker);
  const hasShares = asset?.quantity > 0;
  const canSell = isEditMode || (formData.ticker && hasShares);
  const displayPrice = formData.price ? formatPriceForDisplay(formData.price) : "";

  const modalContent = (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ height: '100vh', width: '100vw', minHeight: '100vh' }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {isEditMode ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-[var(--bg-app)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Buy/Sell Toggle */}
          <ToggleButtonGroup
            options={[
              { value: "Buy", label: "Buy", activeClass: "bg-green-600 text-white shadow-green-900/20" },
              { value: "Sell", label: "Sell", activeClass: "bg-red-600 text-white shadow-red-900/20", disabled: !canSell },
            ]}
            value={formData.type}
            onChange={(type) => setFormData(prev => ({ ...prev, type }))}
          />

          {/* Asset Type Selector - hidden in edit mode */}
          {!isEditMode && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Asset Type</label>
              <ToggleButtonGroup
                options={[
                  { value: "stock", label: "Stock" },
                  { value: "crypto", label: "Crypto" },
                ]}
                value={formData.assetType}
                onChange={(assetType) => {
                  setFormData(prev => ({ ...prev, assetType, ticker: "", name: "", logo: undefined }));
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                error={errors.assetType}
              />
            </div>
          )}

          {/* Ticker Input - hidden in edit mode */}
          {!isEditMode && (
            <div className="relative space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Ticker Symbol</label>
              
              {formData.name ? (
                // selected asset display
                <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {formData.logo ? (
                      <img src={formData.logo} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[10px] border border-[var(--border-subtle)] flex-shrink-0">
                        {formData.ticker[0]}
                      </div>
                    )}
                    <div className="flex flex-col leading-none min-w-0">
                      <span className="text-sm font-bold text-white truncate">{formData.name}</span>
                      <span className="text-xs text-[var(--text-secondary)] capitalize">{formData.assetType}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAsset}
                    className="p-1 hover:bg-[var(--bg-card-hover)] rounded-md transition-colors text-[var(--text-secondary)] hover:text-white flex-shrink-0 ml-2"
                    title="Clear and search again"
                  >
                    <XIcon size={18} weight="bold" />
                  </button>
                </div>
              ) : (
                // ticker input field
                <FormInput
                  name="ticker"
                  value={formData.ticker}
                  onChange={handleChange}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTickerAutofill(e.target.value); setShowDropdown(false); } }}
                  onFocus={() => { if (!formData.ticker) { setShowPopularDropdown(true); setShowDropdown(false); } else { setShowDropdown(true); } }}
                  onBlur={() => { setTimeout(() => { setShowDropdown(false); setShowPopularDropdown(false); }, 200); if (formData.ticker) handleTickerAutofill(formData.ticker); }}
                  placeholder={formData.assetType === "crypto" ? "e.g. BTC, ETH" : "e.g. AAPL, MSFT"}
                  error={errors.ticker}
                  disabled={isSubmitting}
                />
              )}

              {/* Sell warning */}
              {formData.type === "Sell" && formData.ticker && !hasShares && (
                <p className="text-xs text-red-500 mt-1">You don't own any of this asset</p>
              )}

              {/* Dropdowns */}
              {showPopularDropdown && !formData.ticker && !isEditMode && (
                <AssetDropdown 
                  assets={getAssetsByType(formData.assetType, 6)} 
                  onSelect={selectAsset} 
                  title="Popular" 
                />
              )}
              {showDropdown && searchResults.length > 0 && !formData.name && (
                <AssetDropdown assets={searchResults} onSelect={selectAsset} />
              )}
            </div>
          )}

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Quantity"
              name="quantity"
              type="number"
              step="0.0000000001"
              min="0"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="0.00"
              error={errors.quantity}
              disabled={isSubmitting}
            />
            <FormInput
              label="Price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={displayPrice}
              onChange={handleChange}
              onBlur={(e) => { const v = e.target.value; if (v?.trim()) setFormData(prev => ({ ...prev, price: v.trim() })); }}
              placeholder={isFetchingPrice ? "Loading..." : "0.00"}
              error={errors.price}
              disabled={isSubmitting || isFetchingPrice}
              rightIcon={isFetchingPrice && <SpinnerGap size={16} className="animate-spin text-[var(--text-secondary)]" />}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              max={new Date().toISOString().split("T")[0]}
              error={errors.date}
              disabled={isSubmitting}
              style={{ colorScheme: "dark" }}
              inputClassName="text-white"
            />
            <FormInput
              label="Time"
              name="time"
              type="time"
              value={formData.time}
              onChange={handleChange}
              error={errors.time}
              disabled={isSubmitting}
              style={{ colorScheme: "dark" }}
              inputClassName="text-white"
            />
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
              {errors.submit}
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--text-primary)] text-[var(--bg-app)] font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon size={18} weight="bold" />
                  {isEditMode ? "Update Transaction" : "Add Transaction"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
