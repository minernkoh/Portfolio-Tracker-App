// reusable loading state component
// used in Dashboard and AssetDetails

import React from 'react';
import Layout from '../Layout';

export default function LoadingState({ message = 'Loading data...', fullScreen = true }) {
  const content = (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-white/50">
      {message}
    </div>
  );

  if (fullScreen) {
    return <Layout>{content}</Layout>;
  }

  return content;
}

