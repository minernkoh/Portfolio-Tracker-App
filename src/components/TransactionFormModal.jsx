// this component shows a popup form for adding or editing transactions
// it's a modal (popup window) that appears when you click "add transaction"

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { XIcon, CheckIcon, SpinnerGap } from "@phosphor-icons/react";
import { getStockLogo, fetchStockPrices, fetchCryptoPrices, getCryptoInfo } from "../services/api";

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
    assetType: "stock", // pre-select stock
    quantity: "",
    price: "",
    date: new Date().toISOString().split("T")[0],
  });

  // autocomplete state
  const [searchResults, setSearchResults] = useState([]); // matching assets when typing
  const [showDropdown, setShowDropdown] = useState(false); // show/hide autocomplete dropdown
  const [showPopularDropdown, setShowPopularDropdown] = useState(false); // show/hide popular dropdown
  const [isFetchingPrice, setIsFetchingPrice] = useState(false); // loading state for price autofill
  const [isFetchingCryptoInfo, setIsFetchingCryptoInfo] = useState(false); // loading state for crypto info

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

        const isNewTransaction = initialData.isNew && !initialData.id;
        const hasPrice = initialData.price != null && initialData.price !== "";

        setFormData({
          type: initialData.type || "Buy",
          ticker: tickerValue,
          name: initialData.name || (match ? match.name : ""),
          assetType: assetTypeValue,
          logo: initialData.logo || (match ? match.logo : undefined),
          // ensure quantity and price are strings for form input handling
          quantity: initialData.quantity != null ? String(initialData.quantity) : "",
          // Format price to 2 decimals for display when editing
          price: initialData.price != null ? (() => {
            const num = parseFloat(initialData.price);
            return isNaN(num) ? String(initialData.price) : num.toFixed(2);
          })() : "",
          date: initialData.date
            ? new Date(initialData.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        });

        // auto-fetch price if it's a new transaction with ticker but no price
        // never fetch price in edit mode to preserve the saved transaction price
        if (isNewTransaction && tickerValue && !hasPrice && !isEditMode) {
          const assetTypeForFetch = assetTypeValue === "crypto" ? "Crypto" : "Stock";
          fetchCurrentPrice(tickerValue, assetTypeForFetch, false);
        }
      } else {
        // if adding new, reset form to defaults
        setFormData({
          type: "Buy",
          ticker: "",
          name: "",
          assetType: "stock", // pre-select stock
          quantity: "",
          price: "",
          date: new Date().toISOString().split("T")[0],
        });
      }
      setSearchResults([]);
      setShowDropdown(false);
      setShowPopularDropdown(false);
      setErrors({}); // clear any previous errors
    }
  }, [isOpen, initialData, isEditMode]);

  // fetch current market price for a given ticker and asset type
  // only updates price if user hasn't already entered one
  const fetchCurrentPrice = async (ticker, assetType, forceUpdate = false) => {
    // don't overwrite if user has already entered a price (unless forced)
    if (!forceUpdate && formData.price && formData.price.trim() !== "") {
      return;
    }
    
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
        // preserve full precision from API - don't round crypto prices
        // This prevents price changes after transaction is added
        // Store the full precision value, but display with 2 decimals
        const priceValue = priceData.currentPrice;
        // Store full precision value as string
        const priceString = priceValue.toString();
        setFormData((prev) => {
          // only update if no price was entered or if forced
          if (forceUpdate || !prev.price || prev.price.trim() === "") {
            return {
              ...prev,
              price: priceString,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.warn("failed to fetch current price:", error);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // when user selects an asset from autocomplete dropdown
  const selectAsset = (asset) => {
    // check if ticker is changing - if so, clear price to fetch new one
    const tickerChanged = formData.ticker !== asset.ticker;
    
    setFormData((prev) => ({
      ...prev,
      ticker: asset.ticker,
      name: asset.name,
      assetType: asset.type.toLowerCase(), // "stock" or "crypto"
      logo: asset.type === "Stock" ? getStockLogo(asset.ticker) : asset.logo,
      // clear price if ticker changed, otherwise preserve if user entered one
      price: tickerChanged ? "" : (prev.price && prev.price.trim() !== "" ? prev.price : ""),
    }));
    setShowDropdown(false);
    setShowPopularDropdown(false);
    setSearchResults([]);
    
    // always fetch price when ticker changes (force update), or if no price is currently set
    if (tickerChanged) {
      // force update when ticker changes to ensure price is fetched even if old price exists
      fetchCurrentPrice(asset.ticker, asset.type, true);
    } else if (!formData.price || formData.price.trim() === "") {
      fetchCurrentPrice(asset.ticker, asset.type, false);
    }
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
    setShowPopularDropdown(false);
  };

  // handle autofill and price fetching when user finishes entering ticker
  const handleTickerAutofill = async (tickerValue) => {
    if (!tickerValue || tickerValue.trim().length === 0 || isEditMode) {
      return;
    }

    const upperValue = tickerValue.toUpperCase().trim();
    
    // check if ticker is changing - if so, clear price to fetch new one
    const tickerChanged = formData.ticker !== upperValue;
    // only preserve price if ticker hasn't changed AND user has entered one
    const hasExistingPrice = !tickerChanged && formData.price && formData.price.trim() !== "";
    const existingPrice = hasExistingPrice ? formData.price : "";
    
    // try to find matching asset in our list
    const match = SEARCH_ASSETS.find((a) => a.ticker === upperValue);

    if (match) {
      // exact match found - autofill name, asset type, logo, and fetch price
      setFormData((prev) => ({
        ...prev,
        ticker: upperValue,
        name: match.name,
        assetType: match.type.toLowerCase(),
        logo: match.type === "Stock" ? getStockLogo(match.ticker) : match.logo,
        price: existingPrice, // preserve existing price only if ticker didn't change
      }));
      // fetch price if ticker changed or if no price is currently set
      if (tickerChanged || !hasExistingPrice) {
        fetchCurrentPrice(match.ticker, match.type, false);
      }
      } else {
        // no exact match - try to fetch based on current asset type
        const currentAssetType = formData.assetType || "stock";
        
        if (currentAssetType === "crypto" || currentAssetType === "Crypto") {
          // fetch crypto info (name, logo) and price for cryptocurrencies
          setIsFetchingCryptoInfo(true);
          try {
            const cryptoInfo = await getCryptoInfo(upperValue);
            if (cryptoInfo && cryptoInfo.id) {
              // update form with crypto name, logo, and ensure assetType is set
              setFormData((prev) => ({
                ...prev,
                ticker: upperValue,
                name: cryptoInfo.name || upperValue,
                logo: cryptoInfo.logo, // preserve logo from API
                assetType: "crypto", // ensure assetType is set to crypto
                price: existingPrice, // preserve existing price only if ticker didn't change
              }));
            } else {
              // if no crypto info found, just update ticker but keep assetType as crypto
              setFormData((prev) => ({
                ...prev,
                ticker: upperValue,
                assetType: "crypto", // ensure assetType is set to crypto
                price: existingPrice, // preserve existing price only if ticker didn't change
              }));
            }
            // fetch price if ticker changed or if no price is currently set
            if (tickerChanged || !hasExistingPrice) {
              fetchCurrentPrice(upperValue, "Crypto", false);
            }
          } catch (error) {
            console.warn("failed to fetch crypto info:", error);
            // still try to fetch price even if info fetch fails, but keep assetType as crypto
            setFormData((prev) => ({
              ...prev,
              ticker: upperValue,
              assetType: "crypto", // ensure assetType is set to crypto
              price: existingPrice, // preserve existing price only if ticker didn't change
            }));
            // fetch price if ticker changed or if no price is currently set
            if (tickerChanged || !hasExistingPrice) {
              fetchCurrentPrice(upperValue, "Crypto", false);
            }
          } finally {
            setIsFetchingCryptoInfo(false);
          }
        } else {
          // for stocks, just update ticker and try to fetch price
          setFormData((prev) => ({
            ...prev,
            ticker: upperValue,
            assetType: "stock", // ensure assetType is set to stock
            price: existingPrice, // preserve existing price only if ticker didn't change
          }));
          // fetch price if ticker changed or if no price is currently set
          if (tickerChanged || !hasExistingPrice) {
            fetchCurrentPrice(upperValue, "Stock", false);
          }
        }
      }
  };

  // get popular assets based on asset type
  const getPopularAssets = () => {
    const assetType = formData.assetType || "stock"; // default to stock if not selected
    const filtered = SEARCH_ASSETS.filter(
      (a) => a.type.toLowerCase() === assetType.toLowerCase()
    );
    return filtered.slice(0, 6); // return up to 6 items
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

    // special handling for price field - store raw value, format on blur
    if (name === "price") {
      // Store the raw value as user types
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    // special handling for ticker field - show autocomplete only
    if (name === "ticker") {
      const upperValue = value.toUpperCase(); // convert to uppercase

      // only update the ticker value, don't autofill or fetch price yet
      setFormData((prev) => ({
        ...prev,
        [name]: upperValue,
      }));

      // show autocomplete dropdown if typing and not in edit mode
      if (upperValue.length > 0 && !isEditMode) {
        const currentAssetType = formData.assetType || "stock";
        const matches = SEARCH_ASSETS.filter(
          (a) =>
            (a.ticker.startsWith(upperValue) ||
            a.name.toLowerCase().includes(upperValue.toLowerCase())) &&
            a.type.toLowerCase() === currentAssetType.toLowerCase()
        );
        setSearchResults(matches);
        setShowDropdown(true);
        setShowPopularDropdown(false); // hide popular dropdown when typing
      } else {
        setShowDropdown(false);
      }
    } else if (name === "assetType") {
      // when asset type changes, clear ticker and related fields to prevent mismatched asset types
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ticker: "", // clear ticker when asset type changes
        name: "", // clear name
        logo: undefined, // clear logo
      }));
      // clear search results and refresh dropdowns with new asset type
      setSearchResults([]);
      setShowDropdown(false);
      if (showPopularDropdown) {
        // refresh popular dropdown with new asset type
        setShowPopularDropdown(true);
      }
    } else {
      // for other fields, just update the value
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // handle blur event on price field - preserve full precision, only format for display
  const handlePriceBlur = (e) => {
    const priceValue = e.target.value;
    if (priceValue && priceValue.trim() !== "") {
      const num = parseFloat(priceValue);
      if (!isNaN(num) && num >= 0) {
        // Store the raw value to preserve full precision (important for crypto prices)
        // Don't format here - we'll format only for display purposes
        setFormData((prev) => ({ ...prev, price: priceValue.trim() }));
      }
    }
  };

  // format price for display (always 2 decimal places)
  const getDisplayPrice = () => {
    if (!formData.price || formData.price === "") return "";
    const num = parseFloat(formData.price);
    if (isNaN(num)) return formData.price;
    return num.toFixed(2);
  };

  // handle blur event on ticker field - autofill and fetch price
  const handleTickerBlur = (e) => {
    const tickerValue = e.target.value;
    // delay closing dropdowns to allow clicking on items
    setTimeout(() => {
      setShowDropdown(false);
      setShowPopularDropdown(false);
    }, 200);
    if (tickerValue && tickerValue.trim().length > 0) {
      handleTickerAutofill(tickerValue);
    }
  };

  // handle focus event on ticker field - show popular dropdown
  const handleTickerFocus = () => {
    if (!isEditMode && !formData.ticker) {
      // show popular dropdown when focusing on empty ticker field
      setShowPopularDropdown(true);
      setShowDropdown(false);
    } else if (!isEditMode && formData.ticker.length > 0) {
      // show search results if there's text
      setShowDropdown(true);
      setShowPopularDropdown(false);
    }
  };

  // handle keydown event on ticker field - autofill and fetch price on Enter
  const handleTickerKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const tickerValue = e.target.value;
      if (tickerValue && tickerValue.trim().length > 0) {
        setShowDropdown(false); // close dropdown
        handleTickerAutofill(tickerValue);
      }
    }
  };

  // form state
  const [isSubmitting, setIsSubmitting] = useState(false); // is form being submitted?
  const [errors, setErrors] = useState({}); // validation errors

  // validate form before submitting
  const validateForm = () => {
    const newErrors = {};

    // asset type must be selected (only in add mode, not edit mode)
    if (!isEditMode && (!formData.assetType || formData.assetType.trim().length === 0)) {
      newErrors.assetType = "Asset type is required";
    }

    // ticker must be provided and not too long (only in add mode, not edit mode)
    if (!isEditMode) {
      if (!formData.ticker || formData.ticker.trim().length === 0) {
        newErrors.ticker = "Ticker symbol is required";
      } else if (formData.ticker.length > 10) {
        newErrors.ticker = "Ticker symbol is too long";
      }
    }

    // quantity must be a positive number (allows up to 10 decimal places)
    const quantityStr = String(formData.quantity || "").trim();
    const quantity = Number(formData.quantity);
    if (!quantityStr || quantityStr.length === 0) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    } else {
      // check decimal places (allow up to 10)
      const decimalPart = quantityStr.includes('.') ? quantityStr.split('.')[1] : '';
      if (decimalPart && decimalPart.length > 10) {
        newErrors.quantity = "Quantity can have up to 10 decimal places";
      }
    }

    // validate sell transactions - check if user owns enough shares
    if (formData.type === "Sell" && !isEditMode) {
      const asset = portfolioData.find(a => a.ticker === formData.ticker);
      const availableQuantity = asset ? asset.quantity : 0;
      if (quantity > availableQuantity) {
        newErrors.quantity = `You only own ${availableQuantity} ${formData.ticker}. Cannot sell more than you own.`;
      }
    }

    // price must be a non-negative number (allows $0 for airdrops/gifts, up to 10 decimal places)
    const priceStr = String(formData.price || "").trim();
    const price = Number(formData.price);
    if (!priceStr || priceStr.length === 0) {
      newErrors.price = "Price is required";
    } else if (isNaN(price) || price < 0) {
      newErrors.price = "Price must be a non-negative number";
    } else {
      // check decimal places (allow up to 10)
      const decimalPart = priceStr.includes('.') ? priceStr.split('.')[1] : '';
      if (decimalPart && decimalPart.length > 10) {
        newErrors.price = "Price can have up to 10 decimal places";
      }
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
    let submitData = null;
    try {
      // call the onSubmit function passed from parent component
      // include id if editing
      // preserve price as string first to maintain precision, then convert to number
      // use parseFloat instead of Number to preserve decimal precision for crypto
      const priceValue = parseFloat(formData.price);
      const quantityValue = parseFloat(formData.quantity);
      
      submitData = {
        ...formData,
        name: finalName,
        assetType: finalType,
        quantity: quantityValue,
        price: priceValue, // use parseFloat to preserve decimal precision
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
        assetType: "stock", // pre-select stock
        quantity: "",
        price: "",
        date: new Date().toISOString().split("T")[0],
      });
      onClose(); // close modal
    } catch (error) {
      console.error("submission failed", error);
      console.error("submission data:", submitData);
      console.error("form data:", formData);
      console.error("final type:", finalType);
      setErrors({ submit: error.message || "Failed to save transaction" });
      // keep modal open if error
    } finally {
      setIsSubmitting(false);
    }
  };

  // don't render if modal is closed
  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ height: '100vh', width: '100vw', minHeight: '100vh' }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
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
          </div>

          {/* asset type selector - hidden in edit mode */}
          {!isEditMode && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Asset Type
              </label>
              <div className={`flex gap-2 p-1 bg-[var(--bg-app)] rounded-lg border ${
                errors.assetType
                  ? "border-red-500"
                  : "border-[var(--border-subtle)]"
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    // clear ticker and related fields when asset type changes
                    setFormData((prev) => ({
                      ...prev,
                      assetType: "stock",
                      ticker: "", // clear ticker when asset type changes
                      name: "", // clear name
                      logo: undefined, // clear logo
                    }));
                    // clear search results and dropdowns
                    setSearchResults([]);
                    setShowDropdown(false);
                    if (errors.assetType) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.assetType;
                        return newErrors;
                      });
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
                    // clear ticker and related fields when asset type changes
                    setFormData((prev) => ({
                      ...prev,
                      assetType: "crypto",
                      ticker: "", // clear ticker when asset type changes
                      name: "", // clear name
                      logo: undefined, // clear logo
                    }));
                    // clear search results and dropdowns
                    setSearchResults([]);
                    setShowDropdown(false);
                    if (errors.assetType) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.assetType;
                        return newErrors;
                      });
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
              {errors.assetType && (
                <p className="text-xs text-red-500 mt-1">{errors.assetType}</p>
              )}
            </div>
          )}

          {/* ticker input with autocomplete - hidden in edit mode */}
          {!isEditMode && (
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
                    onKeyDown={handleTickerKeyDown}
                    onFocus={handleTickerFocus}
                    onBlur={handleTickerBlur}
                    placeholder={
                      formData.assetType === "crypto"
                        ? "e.g. BTC, ETH"
                        : "e.g. AAPL, MSFT"
                    }
                    autoComplete="off"
                    className={`flex-1 bg-[var(--bg-app)] border rounded-lg px-4 py-3 text-base text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-50 ${
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
              
              {/* show message when user doesn't own asset (only for sell transactions) */}
              {!isEditMode && formData.type === "Sell" && formData.ticker && !portfolioData.find(a => a.ticker === formData.ticker && a.quantity > 0) && (
                <p className="text-xs text-red-500 mt-1">
                  You don't own any of this asset
                </p>
              )}

              {/* popular dropdown - shown when focusing on empty ticker field */}
              {showPopularDropdown && !formData.ticker && !isEditMode && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  <li className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] border-b border-[var(--border-subtle)] bg-[var(--bg-app)] sticky top-0">
                    Popular
                  </li>
                  {getPopularAssets().map((asset) => (
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

            </div>
          </div>
          )}

          {/* quantity and price inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Quantity
              </label>
              <input
                name="quantity"
                type="number"
                step="0.0000000001"
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
                  step="0.01"
                  min="0"
                  value={getDisplayPrice()}
                  onChange={handleChange}
                  onBlur={handlePriceBlur}
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

  return createPortal(modalContent, document.body);
}
