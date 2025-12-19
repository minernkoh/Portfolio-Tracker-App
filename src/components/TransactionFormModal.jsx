// modal form for adding or editing transactions
// refactored to use reusable components and reduce verbosity

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { SpinnerGap } from "@phosphor-icons/react";
import Button from "./ui/Button";
import IconButton from "./ui/IconButton";
import { getStockLogo, fetchStockPrices, fetchCryptoPrices, getCryptoInfo } from "../services/api";
import { formatPriceInput } from "../services/utils";
import { findAssetByTicker, searchAssets, getAssetsByType } from "../constants/assets";
import FormInput from "./ui/FormInput";
import AssetDropdown from "./ui/AssetDropdown";
import ButtonGroup from "./ui/ButtonGroup";

// default form state
const getDefaultFormData = () => ({
  type: "Buy",
  ticker: "",
  name: "",
  assetType: "stock",
  quantity: "",
  price: "",
  totalSpent: "",
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

      const initialQuantity = initialData.quantity != null ? String(initialData.quantity) : "";
      const initialPrice = initialData.price != null ? formatPriceForDisplay(initialData.price) : "";
      const initialTotal = initialQuantity && initialPrice 
        ? (parseFloat(initialQuantity) * parseFloat(initialPrice)).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";

      setFormData({
        type: initialData.type || "Buy",
        ticker: tickerValue,
        name: initialData.name || (match ? match.name : ""),
        assetType: assetTypeValue,
        logo: initialData.logo || (match ? match.logo : undefined),
        quantity: initialQuantity,
        price: initialPrice,
        totalSpent: initialTotal,
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

  // format price for display - use formatPriceInput to preserve precision for small numbers
  const formatPriceForDisplay = (price) => {
    if (price === null || price === undefined || price === "") return "";
    const num = parseFloat(price);
    return isNaN(num) ? String(price) : formatPriceInput(num);
  };

  // fetch current market price from API
  // automatically fills price field when user selects an asset
  const fetchCurrentPrice = useCallback(async (ticker, assetType, forceUpdate = false) => {
    // skip if price already exists and not forcing an update
    if (!forceUpdate && formData.price?.trim()) return;
    
    setIsFetchingPrice(true);
    try {
      // choose appropriate API based on asset type
      const fetchFn = assetType.toLowerCase() === "crypto" ? fetchCryptoPrices : fetchStockPrices;
      const prices = await fetchFn([ticker]);
      const priceData = prices[ticker];
      
      // update form price and name if valid data is received
      if (priceData?.currentPrice > 0) {
        setFormData(prev => {
          const updates = {};
          // only update price if forcing or price field is empty
          if (forceUpdate || !prev.price?.trim()) {
            updates.price = formatPriceInput(priceData.currentPrice);
          }
          // update name from API if not already set or if name matches ticker
          // ensures non-hardcoded tickers get names from the API
          if (priceData.name && (!prev.name || prev.name === prev.ticker)) {
            updates.name = priceData.name;
          }
          return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
        });
      }
    } catch (error) {
      console.warn("Failed to fetch current price:", error);
    } finally {
      setIsFetchingPrice(false);
    }
  }, [formData.price, formData.name, formData.ticker]);

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
        price: tickerChanged ? "" : existingPrice,
      }));
      if (tickerChanged) {
        fetchCurrentPrice(match.ticker, match.type, true);
      } else if (!existingPrice) {
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
            price: tickerChanged ? "" : existingPrice,
          }));
        } catch {
          setFormData(prev => ({ ...prev, ticker: upperValue, assetType: "crypto", price: tickerChanged ? "" : existingPrice }));
        } finally {
          setIsFetchingCryptoInfo(false);
        }
        if (tickerChanged) {
          fetchCurrentPrice(upperValue, "Crypto", true);
        } else if (!existingPrice) {
          fetchCurrentPrice(upperValue, "Crypto", false);
        }
      } else {
        setFormData(prev => ({ ...prev, ticker: upperValue, assetType: "stock", price: tickerChanged ? "" : existingPrice }));
        if (tickerChanged) {
          fetchCurrentPrice(upperValue, "Stock", true);
        } else if (!existingPrice) {
          fetchCurrentPrice(upperValue, "Stock", false);
        }
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
    } else if (name === "quantity" || name === "price") {
      // when quantity or price changes, recalculate total
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // remove commas when parsing
        const quantityStr = name === "quantity" ? value.replace(/,/g, '') : prev.quantity.replace(/,/g, '');
        const priceStr = name === "price" ? value.replace(/,/g, '') : prev.price.replace(/,/g, '');
        const quantity = parseFloat(quantityStr);
        const price = parseFloat(priceStr);
        
        if (!isNaN(quantity) && !isNaN(price) && quantity > 0 && price >= 0) {
          const total = quantity * price;
          // format with commas for thousands
          newData.totalSpent = total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        } else {
          newData.totalSpent = "";
        }
        return newData;
      });
    } else if (name === "totalSpent") {
      // when total is edited, recalculate quantity
      setFormData(prev => {
        const newData = { ...prev, totalSpent: value };
        const total = parseFloat(value.replace(/[^\d.]/g, ''));
        const price = parseFloat(prev.price.replace(/,/g, ''));
        
        if (!isNaN(total) && !isNaN(price) && total >= 0 && price > 0) {
          const calculatedQty = total / price;
          // format quantity with commas for thousands
          newData.quantity = calculatedQty.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 10,
          });
        }
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, [errors, isEditMode, formData.assetType]);

  // validate form
  const validateForm = useCallback(() => {
    const newErrors = {};
    // remove commas when parsing for validation
    const quantity = Number(formData.quantity?.toString().replace(/,/g, ''));
    const price = Number(formData.price?.toString().replace(/,/g, ''));

    if (!isEditMode) {
      if (!formData.assetType?.trim()) newErrors.assetType = "Asset type is required";
      if (!formData.ticker?.trim()) newErrors.ticker = "Ticker symbol is required";
      else if (formData.ticker.length > 10) newErrors.ticker = "Ticker symbol is too long";
    }

    if (!formData.quantity?.toString().trim()) newErrors.quantity = "Quantity is required";
    else if (isNaN(quantity) || quantity <= 0) newErrors.quantity = "Quantity must be a positive number";

    // check if selling more than owned
    if (formData.type === "Sell") {
      const asset = portfolioData.find(a => a.ticker === formData.ticker);
      let availableQuantity = asset?.quantity || 0;
      
      // if editing a sell transaction, add back the original quantity being sold
      if (isEditMode && initialData?.type === "Sell" && initialData?.ticker === formData.ticker) {
        availableQuantity += initialData.quantity;
      }
      
      // if editing a buy transaction to sell, subtract the original buy quantity
      if (isEditMode && initialData?.type === "Buy" && initialData?.ticker === formData.ticker) {
        availableQuantity -= initialData.quantity;
      }
      
      // format availableQuantity with commas for display
      const formattedAvailable = availableQuantity.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 10,
      });
      if (quantity > availableQuantity) {
        newErrors.quantity = `You only own ${formattedAvailable} ${formData.ticker}. Cannot sell more than you own.`;
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
        quantity: parseFloat(formData.quantity.replace(/,/g, '')),
        price: parseFloat(formData.price),
      };
      // remove totalSpent as it's a derived field - backend calculates it from quantity * price
      // also parse totalSpent to remove commas before deletion if needed
      delete submitData.totalSpent;

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

  const modalContent = (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ height: '100vh', width: '100vw', minHeight: '100vh' }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-[90%] sm:w-full max-w-md shadow-2xl overflow-hidden">
        {/* header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {isEditMode ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <IconButton
            variant="close"
            onClick={onClose}
            disabled={isSubmitting}
            size={20}
          />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* buy/sell toggle - hidden in edit mode */}
          {!isEditMode && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Order Type</label>
              <ButtonGroup
                variant="toggle"
                options={[
                  { value: "Buy", label: "Buy", activeClass: "bg-green-600 text-white shadow-green-900/20" },
                  { value: "Sell", label: "Sell", activeClass: "bg-red-600 text-white shadow-red-900/20", disabled: !canSell },
                ]}
                value={formData.type}
                onChange={(type) => setFormData(prev => ({ ...prev, type }))}
              />
            </div>
          )}

          {/* asset type selector - hidden in edit mode */}
          {!isEditMode && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Asset Type</label>
              <ButtonGroup
                variant="toggle"
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

          {/* ticker input - hidden in edit mode */}
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
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate">{formData.name}</span>
                      <span className="text-xs text-[var(--text-secondary)] capitalize">{formData.assetType}</span>
                    </div>
                  </div>
                  <IconButton
                    variant="close"
                    onClick={clearAsset}
                    title="Clear and search again"
                    size={18}
                    weight="bold"
                    className="flex-shrink-0 ml-2"
                  />
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

              {/* sell warning */}
              {formData.type === "Sell" && formData.ticker && !hasShares && (
                <p className="text-xs text-red-500 mt-1">You don't own any of this asset</p>
              )}

              {/* dropdowns */}
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

          {/* quantity and price */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Quantity"
              name="quantity"
              type="text"
              value={formData.quantity}
              onChange={(e) => {
                // remove commas and other non-numeric characters except decimal point
                const v = e.target.value.replace(/[^\d.]/g, '');
                handleChange({ ...e, target: { ...e.target, name: 'quantity', value: v } });
              }}
              onKeyDown={(e) => {
                // prevent form submission when Enter is pressed
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.target.blur(); // Trigger blur to format the value
                }
              }}
              onBlur={(e) => {
                const v = e.target.value?.trim().replace(/[^\d.]/g, '');
                if (v) {
                  const num = parseFloat(v);
                  if (!isNaN(num) && num >= 0) {
                    // format with commas for thousands
                    const formatted = num.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 10,
                    });
                    setFormData(prev => {
                      const newData = { ...prev, quantity: formatted };
                      // recalculate total after quantity is formatted
                      const quantityNum = parseFloat(formatted.replace(/,/g, ''));
                      const price = parseFloat(prev.price.replace(/,/g, ''));
                      if (!isNaN(quantityNum) && !isNaN(price) && quantityNum > 0 && price >= 0) {
                        const total = quantityNum * price;
                        newData.totalSpent = total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                      }
                      return newData;
                    });
                  }
                }
              }}
              placeholder="0.00"
              error={errors.quantity}
              disabled={isSubmitting}
            />
            <FormInput
              label="Price"
              name="price"
              type="number"
              step="any"
              min="0"
              value={formData.price}
              onChange={handleChange}
              onBlur={(e) => {
                const v = e.target.value?.trim();
                if (v) {
                  const num = parseFloat(v);
                  if (!isNaN(num) && num >= 0) {
                    // format for display but preserve full precision in the actual value
                    // use formatPriceInput to show appropriate decimal places
                    const formatted = formatPriceInput(num);
                    setFormData(prev => {
                      const newData = { ...prev, price: formatted };
                      // recalculate total after price is formatted
                      const quantity = parseFloat(prev.quantity);
                      const priceNum = parseFloat(formatted);
                      if (!isNaN(quantity) && !isNaN(priceNum) && quantity > 0 && priceNum >= 0) {
                        const total = quantity * priceNum;
                        // format with commas for thousands
                        newData.totalSpent = total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                      }
                      return newData;
                    });
                  }
                }
              }}
              placeholder={isFetchingPrice ? "Loading..." : "0.00"}
              error={errors.price}
              disabled={isSubmitting || isFetchingPrice}
              leftIcon={<span className="text-[var(--text-primary)]">$</span>}
              rightIcon={isFetchingPrice && <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)]" />}
            />
          </div>

          {/* date and time */}
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
              inputClassName="text-[var(--text-primary)]"
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
              inputClassName="text-[var(--text-primary)]"
            />
          </div>

          {/* total spent */}
          <FormInput
            label="Total Spent"
            name="totalSpent"
            type="text"
            value={formData.totalSpent}
            onChange={(e) => {
              // remove commas and other non-numeric characters except decimal point
              const v = e.target.value.replace(/[^\d.]/g, '');
              handleChange({ ...e, target: { ...e.target, name: 'totalSpent', value: v } });
            }}
            onKeyDown={(e) => {
              // prevent form submission when Enter is pressed
              if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur(); // trigger blur to format the value
              }
            }}
            onBlur={(e) => {
              const v = e.target.value?.trim().replace(/[^\d.]/g, '');
              if (v) {
                const num = parseFloat(v);
                if (!isNaN(num) && num >= 0) {
                  // format with commas for thousands
                  const formatted = num.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                  setFormData(prev => {
                    const newData = { ...prev, totalSpent: formatted };
                    // recalculate quantity after total is formatted
                    const price = parseFloat(prev.price.replace(/,/g, ''));
                    if (!isNaN(price) && price > 0) {
                      const calculatedQty = num / price;
                      // format quantity with commas for thousands
                      newData.quantity = calculatedQty.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 10,
                      });
                    }
                    return newData;
                  });
                }
              }
            }}
            placeholder="0.00"
            error={errors.totalSpent}
            disabled={isSubmitting}
            leftIcon={<span className="text-[var(--text-primary)]">$</span>}
            inputClassName="text-base font-bold"
          />

          {/* error message */}
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
              {errors.submit}
            </div>
          )}

          {/* submit button */}
          <div className="pt-2">
            <Button
              type="submit"
              loading={isSubmitting}
              fullWidth
              size="lg"
            >
              {isEditMode ? "Edit Transaction" : "Add Transaction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
