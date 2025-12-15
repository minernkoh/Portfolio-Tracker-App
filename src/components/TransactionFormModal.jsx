// this component shows a popup form for adding or editing transactions
// it's a modal (popup window) that appears when you click "add transaction"

import React, { useState, useEffect } from "react";
import { XIcon, CheckIcon } from "@phosphor-icons/react";
import { getStockLogo } from "../services/api";

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
          quantity: initialData.quantity || "",
          price: initialData.price || "",
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
    const quantity = Number(formData.quantity);
    if (!formData.quantity || formData.quantity.trim().length === 0) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    }

    // price must be a positive number
    const price = Number(formData.price);
    if (!formData.price || formData.price.trim().length === 0) {
      newErrors.price = "Price is required";
    } else if (isNaN(price) || price <= 0) {
      newErrors.price = "Price must be a positive number";
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
            {isEditMode ? "Edit transaction" : "Add transaction"}
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
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, type: "Sell" }))}
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                formData.type === "Sell"
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              Sell
            </button>
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
                    className={`flex-1 bg-[var(--bg-app)] border rounded-lg px-4 py-3 text-base font-bold text-[var(--text-primary)] focus:outline-none transition-colors uppercase disabled:opacity-50 ${
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
              <input
                name="price"
                type="number"
                step="any"
                min="0"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
                className={`w-full bg-[var(--bg-app)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none transition-colors disabled:opacity-50 ${
                  errors.price
                    ? "border-red-500 focus:border-red-500"
                    : "border-[var(--border-subtle)] focus:border-[var(--text-secondary)]"
                }`}
              />
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
                  {isEditMode ? "Update transaction" : "Add transaction"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
