import React from 'react';

interface AdminPanelProps {
  username: string;
  onClose: () => void;
}

export function AdminPanel({ username, onClose }: AdminPanelProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-8 max-w-xl w-full text-center">
        <h3 className="text-white text-lg mb-2">Admin Panel Unavailable</h3>
        <p className="text-gray-300 mb-4">The admin UI is temporarily disabled during deployment. Please deploy the backend Worker to enable it.</p>
        <div className="flex justify-center gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-pink-600 rounded-md text-white">Close</button>
        </div>
      </div>
    </div>
  );
}
