/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global Keyboard Manager for Vanguard Application
 * Handles system-wide shortcuts (Alt+N, Alt+S, Esc)
 */
export default function KeyboardManager() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // 1. Alt + N -> New Voucher (Navigates to /vouchers with new trigger)
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        navigate('/vouchers?new=true');
      }

      // 2. Escape Fallback -> Global closure attempt
      // Most modals should handle this locally to prevent conflicts with dropdown search
      // but this serves as a baseline.
      if (e.key === 'Escape') {
        const event = new CustomEvent('app-escape-pressed');
        window.dispatchEvent(event);
      }
      
      // 3. Alt + S -> Global Save Trigger
      if (e.altKey && e.key.toLowerCase() === 's') {
        const event = new CustomEvent('app-save-triggered');
        window.dispatchEvent(event);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [navigate]);

  return null; // Side-effect only component
}
