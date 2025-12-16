// this component shows a popup form for adding or editing transactions
// it's a modal (popup window) that appears when you click "add transaction"

import React, { useState, useEffect } from "react";
import { XIcon, CheckIcon, SpinnerGap } from "@phosphor-icons/react";
import { getStockLogo, fetchStockPrices, fetchCryptoPrices } from "../services/api";

// list of popular assets for autocomplete (search suggestions)
// when you type a ticker, it shows matching assets from this list
const SEARCH_ASSETS = [
  // popular stocks
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    type: "Stock",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    type: "Stock",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    type: "Stock",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    type: "Stock",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    type: "Stock",
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    type: "Stock",
  },
  {
    ticker: "META",
    name: "Meta Platforms Inc.",
    type: "Stock",
  },
  {
    ticker: "BRK.B",
    name: "Berkshire Hathaway",
    type: "Stock",
  },
  {
    ticker: "V",
    name: "Visa Inc.",
    type: "Stock",
  },
  {
    ticker: "TSM",
    name: "Taiwan Semiconductor",
    type: "Stock",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase",
    type: "Stock",
  },
  // popular cryptocurrencies
  {
    ticker: "BTC",
    name: "Bitcoin",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  },
  {
    ticker: "ETH",
    name: "Ethereum",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    ticker: "SOL",
    name: "Solana",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  },
  {
    ticker: "BNB",
    name: "Binance Coin",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
  },
  {
    ticker: "AVAX",
    name: "Avalanche",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png",
  },
  {
    ticker: "DOGE",
    name: "Dogecoin",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  },
  {
    ticker: "DOT",
    name: "Polkadot",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  },
  {
    ticker: "LINK",
    name: "Chainlink",
    type: "Crypto",
    logo: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  },
];

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEditMode = false,
  portfolioData = [],
}) {
  // form data state - stores what the user types in the form
  const [formData, setFormData] = useState({
    type: "Buy",
    ticker: "",
    name: "",
    assetType: "stock",
    quantity: "",
    price: "",
    date: new Date().toISOString().split("T")[0],
  });

  // autocomplete state
  const [searchResults, setSearchResults] = useState([]); // matching assets when typing
  const [showDropdown, setShowDropdown] = useState(false); // show/hide autocomplete dropdown
  const [isFetchingPrice, setIsFetchingPrice] = useState(false); // loading state for price autofill

  // when modal opens, pre-fill form if editing
  useEffect(() => {
    if (isOpen) {
      if (initialData && typeof initialData === "object") {
        // ensure ticker is a string, not an object
        const tickerValue =
          typeof initialData.ticker === "string" ? initialData.ticker : "";

        // if editing, fill form with existing data
        const match = SEARCH_ASSETS.find((a) => a.ticker === tickerValue);

        // normalize asset type - handle both "Stock"/"Crypto" and "stock"/"crypto"
        let assetTypeValue =
          initialData.assetType || (match ? match.type.toLowerCase() : "stock");
        if (typeof assetTypeValue === "string") {
          assetTypeValue = assetTypeValue.toLowerCase();
        }

        setFormData({
          type: initialData.type || "Buy",
          ticker: tickerValue,
          name: initialData.name || (match ? match.name : ""),
          assetType: assetTypeValue,
          logo: initialData.logo || (match ? match.logo : undefined),
          // ensure quantity and price are strings for form input handling
          quantity: initialData.quantity != null ? String(initialData.quantity) : "",
          price: initialData.price != null ? String(initialData.price) : "",
          date: initialData.date
            ? new Date(initialData.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        });
      } else {
        // if adding new, reset form to defaults
        setFormData({
          type: "Buy",
          ticker: "",
          name: "",
          assetType: "stock",
          quantity: "",
          price: "",
          date: new Date().toISOString().split("T")[0],
        });
      }
      setSearchResults([]);
      setShowDropdown(false);
      setErrors({}); // clear any previous errors
    }
  }, [isOpen, initialData]);

  // fetch current market price for a given ticker and asset type
  const fetchCurrentPrice = async (ticker, assetType) => {
    setIsFetchingPrice(true);
    try {
      let priceData = null;
      if (assetType.toLowerCase() === "crypto") {
        const prices = await fetchCryptoPrices([ticker]);
        priceData = prices[ticker];
      } else {
        const prices = await fetchStockPrices([ticker]);
        priceData = prices[ticker];
      }
      
      if (priceData && priceData.currentPrice > 0) {
        setFormData((prev) => ({
          ...prev,
          price: priceData.currentPrice.toString(),
        }));
      }
    } catch (error) {
      console.warn("failed to fetch current price:", error);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // when user selects an asset from autocomplete dropdown
  const selectAsset = (asset) => {
    setFormData((prev) => ({
      ...prev,
      ticker: asset.ticker,
      name: asset.name,
      assetType: asset.type.toLowerCase(), // "stock" or "crypto"
      logo: asset.type === "Stock" ? getStockLogo(asset.ticker) : asset.logo,
    }));
    setShowDropdown(false);
    setSearchResults([]);
    
    // autofill price with current market price
    fetchCurrentPrice(asset.ticker, asset.type);
  };

  // clear selected asset to allow searching again
  const clearAsset = () => {
    setFormData((prev) => ({
      ...prev,
      ticker: "",
      name: "",
      logo: undefined,
    }));
    setSearchResults([]);
    setShowDropdown(false);
  };

  // handle input changes in the form
  const handleChange = (e) => {
    const { name, value } = e.target;

    // clear any errors for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // special handling for ticker field - show autocomplete
    if (name === "ticker") {
      const upperValue = value.toUpperCase(); // convert to uppercase

      // try to find matching asset in our list
      const match = SEARCH_ASSETS.find((a) => a.ticker === upperValue);

      setFormData((prev) => ({
        ...prev,
        [name]: upperValue,
        name: match ? match.name : prev.name, // auto-fill name if found
        assetType: match ? match.type.toLowerCase() : prev.assetType,
        logo: match
          ? match.type === "Stock"
            ? getStockLogo(match.ticker)
            : match.logo
          : undefined,
      }));

      // if exact match found, fetch current market price
      if (match && !isEditMode) {
        fetchCurrentPrice(match.ticker, match.type);
      } else if (!match && upperValue.length > 0 && !isEditMode) {
        // if no match but ticker is entered, try to fetch price based on current assetType
        // this helps when user manually types a ticker and selects asset type
        const currentAssetType = formData.assetType || "stock";
        if (currentAssetType === "crypto" || currentAssetType === "Crypto") {
          fetchCurrentPrice(upperValue, "Crypto");
        }
      }

      // show autocomplete dropdown if typing and not in edit mode
      if (upperValue.length > 0 && !isEditMode) {
        const matches = SEARCH_ASSETS.filter(
          (a) =>
            a.ticker.startsWith(upperValue) ||
            a.name.toLowerCase().includes(upperValue.toLowerCase())
        );
        setSearchResults(matches);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    } else {
      // for other fields, just update the value
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // form state
  const [isSubmitting, setIsSubmitting] = useState(false); // is form being submitted?
  const [errors, setErrors] = useState({}); // validation errors

  // validate form before submitting
  const validateForm = () => {
    const newErrors = {};

    // ticker must be provided and not too long
    if (!formData.ticker || formData.ticker.trim().length === 0) {
      newErrors.ticker = "Ticker symbol is required";
    } else if (formData.ticker.length > 10) {
      newErrors.ticker = "Ticker symbol is too long";
    }

    // quantity must be a positive number
    const quantityStr = String(formData.quantity || "").trim();
    const quantity = Number(formData.quantity);
    if (!quantityStr || quantityStr.length === 0) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    }

    // validate sell transactions - check if user owns enough shares
    if (formData.type === "Sell" && !isEditMode) {
      const asset = portfolioData.find(a => a.ticker === formData.ticker);
      const availableQuantity = asset ? asset.quantity : 0;
      if (quantity > availableQuantity) {
        newErrors.quantity = `You only own ${availableQuantity} ${formData.ticker}. Cannot sell more than you own.`;
      }
    }

    // price must be a non-negative number (allows $0 for airdrops/gifts)
    const priceStr = String(formData.price || "").trim();
    const price = Number(formData.price);
    if (!priceStr || priceStr.length === 0) {
      newErrors.price = "Price is required";
    } else if (isNaN(price) || price < 0) {
      newErrors.price = "Price must be a non-negative number";
    }

    // date must be provided and not in the future
    if (!formData.date) {
      newErrors.date = "Date is required";
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // end of today

      if (selectedDate > today) {
        newErrors.date = "Date cannot be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // return true if no errors
  };

  // handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent page refresh

    // validate form first
    if (!validateForm()) {
      return; // stop if validation failed
    }

    // use provided name or fallback to ticker
    const finalName = formData.name || formData.ticker;
    // normalize asset type to capitalized format for airtable
    let finalType = (formData.assetType || "stock").toLowerCase();
    finalType = finalType === "crypto" ? "Crypto" : "Stock";

    setIsSubmitting(true);
    try {
      // call the onSubmit function passed from parent component
      // include id if editing
      const submitData = {
        ...formData,
        name: finalName,
        assetType: finalType,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
      };

      // if editing, include the id (check both isEditMode prop and initialData.id)
      if (
        (isEditMode || (initialData && initialData.id)) &&
        initialData &&
        initialData.id
      ) {
        submitData.id = initialData.id;
      }

      await onSubmit(submitData);
      // clear errors and form data on success
      setErrors({});
      // reset form to defaults
      setFormData({
        type: "Buy",
        ticker: "",
        name: "",
        assetType: "stock",
        quantity: "",
        price: "",
        date: new Date().toISOString().split("T")[0],
      });
      onClose(); // close modal
    } catch (error) {
      console.error("submission failed", error);
      setErrors({ submit: error.message || "Failed to save transaction" });
      // keep modal open if error
    } finally {
      setIsSubmitting(false);
    }
  };

  // don't render if modal is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        {/* modal header */}
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

        {/* form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* buy/sell toggle buttons */}
          <div className="space-y-2">
            <div className="flex gap-2 p-1 bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: "Buy" }))}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                  formData.type === "Buy"
                    ? "bg-green-600 text-white shadow-lg shadow-green-900/20"
                    : "text-[var(--text-secondary)] hover:text-white"
                }`}
              >
                Buy
              </button>
              {(() => {
                const asset = portfolioData.find(a => a.ticker === formData.ticker);
                const hasShares = asset && asset.quantity > 0;
                // Enable sell if: editing mode (to allow editing existing sells) OR has shares
                // Disable if: no ticker entered OR ticker entered but no shares
                const canSell = isEditMode || (formData.ticker && hasShares);
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (canSell) {
                        setFormData((prev) => ({ ...prev, type: "Sell" }));
                      }
                    }}
                    disabled={!canSell}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                      formData.type === "Sell"
                        ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                        : canSell
                        ? "text-[var(--text-secondary)] hover:text-white"
                        : "text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                    }`}
                  >
                    Sell
                  </button>
                );
              })()}
            </div>
            {/* show message when sell is disabled */}
            {!isEditMode && formData.ticker && !portfolioData.find(a => a.ticker === formData.ticker && a.quantity > 0) && (
              <p className="text-xs text-[var(--text-secondary)] text-center">
                You don't own any of this asset
              </p>
            )}
          </div>

          {/* ticker input with autocomplete */}
          <div className="space-y-4">
            <div className="space-y-1 relative">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Ticker Symbol
              </label>
              <div className="flex items-center gap-2">
                {/* show selected asset or input field */}
                {formData.name && !isEditMode ? (
                  <div className="flex-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {formData.logo ? (
                        <img
                          src={formData.logo}
                          alt=""
                          className="w-6 h-6 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[10px] border border-[var(--border-subtle)] flex-shrink-0">
                          {formData.ticker[0]}
                        </div>
                      )}
                      <div className="flex flex-col leading-none min-w-0">
                        <span className="text-sm font-bold text-white truncate">
                          {formData.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] capitalize">
                          {formData.assetType}
                        </span>
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
                  <input
                    name="ticker"
                    value={
                      typeof formData.ticker === "string" ? formData.ticker : ""
                    }
                    onChange={handleChange}
                    onFocus={() => {
                      if (formData.ticker && !isEditMode) setShowDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="e.g. BTC, AAPL"
                    autoComplete="off"
                    className={`flex-1 bg-[var(--bg-app)] border rounded-lg px-4 py-3 text-base font-bold text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-50 ${
                      errors.ticker
                        ? "border-red-500 focus:border-red-500"
                        : "border-[var(--border-subtle)] focus:border-[var(--text-secondary)]"
                    }`}
                    disabled={isSubmitting}
                  />
                )}
              </div>
              {errors.ticker && (
                <p className="text-xs text-red-500 mt-1">{errors.ticker}</p>
              )}

              {/* autocomplete dropdown */}
              {showDropdown && searchResults.length > 0 && !formData.name && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {searchResults.map((asset) => (
                    <li
                      key={asset.ticker}
                      onClick={() => selectAsset(asset)}
                      className="px-4 py-3 hover:bg-[var(--bg-card-hover)] cursor-pointer flex justify-between items-center group border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {(asset.logo || asset.type === "Stock") && (
                          <img
                            src={
                              asset.type === "Stock"
                                ? getStockLogo(asset.ticker)
                                : asset.logo
                            }
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div>
                          <span className="font-bold text-white text-sm block">
                            {asset.ticker}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] group-hover:text-white transition-colors">
                            {asset.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs bg-[var(--bg-app)] px-2 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {asset.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* asset type selector - show when ticker is entered but not matched */}
              {formData.ticker && !formData.name && !isEditMode && (
                <div className="mt-2 space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Asset Type
                  </label>
                  <div className="flex gap-2 p-1 bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, assetType: "stock" }));
                        // try to fetch price when asset type changes
                        if (formData.ticker) {
                          fetchCurrentPrice(formData.ticker, "Stock");
                        }
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                        formData.assetType === "stock"
                          ? "bg-[var(--accent-blue)] text-white shadow-lg"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, assetType: "crypto" }));
                        // try to fetch price when asset type changes
                        if (formData.ticker) {
                          fetchCurrentPrice(formData.ticker, "Crypto");
                        }
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                        formData.assetType === "crypto"
                          ? "bg-[var(--accent-blue)] text-white shadow-lg"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      Crypto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* quantity and price inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Quantity
              </label>
              <input
                name="quantity"
                type="number"
                step="any"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
                className={`w-full bg-[var(--bg-app)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-50 ${
                  errors.quantity
                    ? "border-red-500 focus:border-red-500"
                    : "border-[var(--border-subtle)] focus:border-[var(--text-secondary)]"
                }`}
              />
              {errors.quantity && (
                <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Price
              </label>
              <div className="relative">
                <input
                  name="price"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder={isFetchingPrice ? "Loading..." : "0.00"}
                  disabled={isSubmitting || isFetchingPrice}
                  className={`w-full bg-[var(--bg-app)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-50 ${
                    errors.price
                      ? "border-red-500 focus:border-red-500"
                      : "border-[var(--border-subtle)] focus:border-[var(--text-secondary)]"
                  }`}
                />
                {isFetchingPrice && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <SpinnerGap size={16} className="animate-spin text-[var(--text-secondary)]" />
                  </div>
                )}
              </div>
              {errors.price && (
                <p className="text-xs text-red-500 mt-1">{errors.price}</p>
              )}
            </div>
          </div>

          {/* date input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Date
            </label>
            <input
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              max={new Date().toISOString().split("T")[0]}
              disabled={isSubmitting}
              className={`w-full bg-[var(--bg-app)] border rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors disabled:opacity-50 ${
                errors.date
                  ? "border-red-500 focus:border-red-500"
                  : "border-[var(--border-subtle)] focus:border-[var(--text-secondary)]"
              }`}
              style={{
                colorScheme: "dark",
              }}
            />
            {errors.date && (
              <p className="text-xs text-red-500 mt-1">{errors.date}</p>
            )}
          </div>

          {/* error message */}
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
              {errors.submit}
            </div>
          )}

          {/* submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--text-primary)] text-[var(--bg-app)] font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
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
}
