'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [customerRef, setCustomerRef] = useState('');
  const router = useRouter();

  // Check if already authenticated on mount
  useEffect(() => {
    const savedRef = localStorage.getItem('customerRef');
    if (savedRef) {
      router.push('/tickets');
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerRef.trim()) {
      // For demo purposes, accept any customer reference
      // In production, this would validate against a customer database
      localStorage.setItem('customerRef', customerRef.trim());
      router.push('/tickets');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Customer Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your customer reference to access your support tickets
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="customerRef" className="sr-only">
              Customer Reference
            </label>
            <input
              id="customerRef"
              name="customerRef"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your customer reference"
              value={customerRef}
              onChange={(e) => setCustomerRef(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Access Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
