/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, ExternalLink, Settings } from 'lucide-react';

export default function SetupRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-100 p-4 rounded-full">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2 font-sans">
          Setup Required
        </h2>
        
        <p className="text-gray-600 text-center mb-8 text-sm">
          Supabase credentials are missing. To enable authentication and data storage, please configure your environment variables.
        </p>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Required Variables</h3>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <code>VITE_SUPABASE_URL</code>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <code>VITE_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl text-indigo-700">
            <Settings size={20} className="shrink-0" />
            <p className="text-xs font-medium">
              Open the <strong>Secrets</strong> panel in the AI Studio sidebar to add these keys.
            </p>
          </div>
          
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span>Get Supabase Keys</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
