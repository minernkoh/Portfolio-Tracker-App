import React, { useState, useEffect } from 'react';
import { X, Check } from '@phosphor-icons/react';

// Top Assets for Autocomplete with Logos
const SEARCH_ASSETS = [
  // Stocks
  { ticker: 'AAPL', name: 'Apple Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/apple.com' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', type: 'Stock', logo: 'https://logo.clearbit.com/microsoft.com' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/abc.xyz' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/amazon.com' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', type: 'Stock', logo: 'https://logo.clearbit.com/nvidia.com' },
  { ticker: 'TSLA', name: 'Tesla Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/tesla.com' },
  { ticker: 'META', name: 'Meta Platforms Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/meta.com' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', type: 'Stock', logo: 'https://logo.clearbit.com/berkshirehathaway.com' },
  { ticker: 'LLY', name: 'Eli Lilly and Co.', type: 'Stock', logo: 'https://logo.clearbit.com/lilly.com' },
  { ticker: 'V', name: 'Visa Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/visa.com' },
  { ticker: 'TSM', name: 'Taiwan Semiconductor', type: 'Stock', logo: 'https://logo.clearbit.com/tsmc.com' },
  { ticker: 'JPM', name: 'JPMorgan Chase', type: 'Stock', logo: 'https://logo.clearbit.com/jpmorganchase.com' },
  { ticker: 'WMT', name: 'Walmart Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/walmart.com' },
  { ticker: 'XOM', name: 'Exxon Mobil', type: 'Stock', logo: 'https://logo.clearbit.com/exxonmobil.com' },
  { ticker: 'MA', name: 'Mastercard Inc.', type: 'Stock', logo: 'https://logo.clearbit.com/mastercard.com' },
  // Crypto
  { ticker: 'BTC', name: 'Bitcoin', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { ticker: 'ETH', name: 'Ethereum', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { ticker: 'SOL', name: 'Solana', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { ticker: 'BNB', name: 'Binance Coin', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png' },
  { ticker: 'XRP', name: 'Ripple', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { ticker: 'ADA', name: 'Cardano', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  { ticker: 'AVAX', name: 'Avalanche', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png' },
  { ticker: 'DOGE', name: 'Dogecoin', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { ticker: 'DOT', name: 'Polkadot', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
  { ticker: 'LINK', name: 'Chainlink', type: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
];

export default function TransactionFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null,
  isEditMode = false 
}) {
  const [formData, setFormData] = useState({
    type: 'Buy',
    ticker: '',
    name: '',
    assetType: 'stock',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // handle both edit mode and quick add (isNew flag)
        // search for asset to pre-fill logo if needed
        const match = SEARCH_ASSETS.find(a => a.ticker === initialData.ticker);
        
        setFormData({
            type: initialData.type || 'Buy',
            ticker: initialData.ticker || '',
            name: initialData.name || (match ? match.name : ''),
            assetType: initialData.assetType || (match ? match.type.toLowerCase() : 'stock'),
            logo: initialData.logo || (match ? match.logo : undefined),
            quantity: initialData.quantity || '',
            price: initialData.price || '',
            date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
      } else {
        // reset for new transaction
        setFormData({
          type: 'Buy',
          ticker: '',
          name: '',
          assetType: 'stock',
          quantity: '',
          price: '',
          date: new Date().toISOString().split('T')[0]
        });
      }
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [isOpen, initialData]);

  const selectAsset = (asset) => {
    setFormData(prev => ({
      ...prev,
      ticker: asset.ticker,
      name: asset.name,
      assetType: asset.type.toLowerCase(),
      logo: asset.logo
    }));
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'ticker') {
        const upperValue = value.toUpperCase();
        
        // Auto-detect from local list even if not clicked
        const match = SEARCH_ASSETS.find(a => a.ticker === upperValue);
        
        setFormData(prev => ({ 
            ...prev, 
            [name]: upperValue,
            name: match ? match.name : prev.name,
            assetType: match ? match.type.toLowerCase() : prev.assetType,
            logo: match ? match.logo : undefined
        }));
        
        if (upperValue.length > 0 && !isEditMode) {
            const matches = SEARCH_ASSETS.filter(a => 
                a.ticker.startsWith(upperValue) || a.name.toLowerCase().includes(upperValue.toLowerCase())
            );
            setSearchResults(matches);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... (keep existing code until handleSubmit)

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ticker || !formData.quantity || !formData.price) return;

    // Final fallback if name is empty (unknown asset)
    const finalName = formData.name || formData.ticker;
    const finalType = formData.assetType || 'stock';

    setIsSubmitting(true);
    try {
        await onSubmit({
          ...formData,
          name: finalName,
          assetType: finalType,
          quantity: Number(formData.quantity),
          price: Number(formData.price)
        });
        onClose();
    } catch (error) {
        console.error("Submission failed", error);
        // keep modal open if error
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        {/* header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-[var(--bg-app)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Transaction Type */}
          <div className="flex gap-2 p-1 bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)]">
            <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'Buy' }))}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                  formData.type === 'Buy' 
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Buy
            </button>
            <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'Sell' }))}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                  formData.type === 'Sell' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Sell
            </button>
          </div>

          {/* Ticker & Name (No separate Name/Type fields anymore!) */}
          <div className="space-y-4">
              <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Ticker Symbol</label>
                  <div className="flex items-center gap-2">
                      <input 
                        name="ticker"
                        value={formData.ticker}
                        onChange={handleChange}
                        onFocus={() => { if(formData.ticker && !isEditMode) setShowDropdown(true); }}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        placeholder="e.g. BTC, AAPL"
                        autoComplete="off"
                        className="flex-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-base font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors uppercase disabled:opacity-50"
                        disabled={isEditMode || isSubmitting} 
                      />
                      {/* Show detected asset info if available */}
                      {formData.name && (
                          <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-2 rounded-lg flex items-center gap-2 min-w-[100px]">
                             {formData.logo ? (
                                 <img src={formData.logo} alt="" className="w-6 h-6 rounded-full" />
                             ) : (
                                 <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[10px] border border-[var(--border-subtle)]">
                                     {formData.ticker[0]}
                                 </div>
                             )}
                             <div className="flex flex-col leading-none">
                                 <span className="text-xs font-bold text-white truncate max-w-[80px]">{formData.name}</span>
                                 <span className="text-[10px] text-[var(--text-secondary)] capitalize">{formData.assetType}</span>
                             </div>
                          </div>
                      )}
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {searchResults.map((asset) => (
                              <li 
                                  key={asset.ticker}
                                  onClick={() => selectAsset(asset)}
                                  className="px-4 py-3 hover:bg-[var(--bg-card-hover)] cursor-pointer flex justify-between items-center group border-b border-[var(--border-subtle)] last:border-0"
                              >
                                  <div className="flex items-center gap-3">
                                      {asset.logo && <img src={asset.logo} alt="" className="w-6 h-6 rounded-full" />}
                                      <div>
                                          <span className="font-bold text-white text-sm block">{asset.ticker}</span>
                                          <span className="text-xs text-[var(--text-secondary)] group-hover:text-white transition-colors">{asset.name}</span>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Quantity</label>
              <input 
                name="quantity"
                type="number"
                step="any"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Price</label>
              <input 
                name="price"
                type="number"
                step="any"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Date</label>
            <input 
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors text-white calendar-picker-indicator-white disabled:opacity-50"
            />
          </div>

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
                   <Check size={18} weight="bold" />
                   {isEditMode ? 'Update Transaction' : 'Add Transaction'}
                 </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
