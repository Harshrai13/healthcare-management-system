import { memo } from 'react';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-primary-100" />
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-transparent border-t-primary-700 animate-spin" />
      </div>
    </div>
  );
}

export default memo(LoadingSpinner);
