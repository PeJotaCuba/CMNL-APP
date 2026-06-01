/**
 * DeviceIdentityService
 * 
 * Modular service in TypeScript that provides a unique and highly persistent identity
 * for the PWA device. Avoids losing the DVC identifier during PWA updates or cache clears
 * by utilizing a dual-storage strategy (IndexedDB as primary, localStorage as fallback).
 */

export interface DeviceSignature {
  deviceId: string;     // Cryptographically secure UUID v4
  deviceToken: string;  // The "DVC-XXXX" token used for login matching
  platform: string;     // OS Name (e.g. Android, iOS, Windows, macOS, Linux)
  browser: string;      // Browser Name (e.g. Chrome, Safari, Firefox, Edge)
  resolution: string;   // Screen resolution (e.g. "1920x1080")
  isPWA: boolean;       // standalone mode check
  createdAt: string;    // Date ISO string
}

const DB_NAME = 'RCMDeviceIdentityDB';
const STORE_NAME = 'identityStore';
const DB_VERSION = 1;

/**
 * Native IndexedDB helper functions wrapped in Promises
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

function getValueIDB<T>(key: string): Promise<T | null> {
  return new Promise(async (resolve) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch (e) {
      console.warn('Error reading from IndexedDB:', e);
      resolve(null); // Fail-safe fallback to localStorage
    }
  });
}

function setValueIDB<T>(key: string, value: T): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        resolve(false);
      };
    } catch (e) {
      console.warn('Error writing to IndexedDB:', e);
      resolve(false);
    }
  });
}

/**
 * Utility to generate a secure UUID v4 using the native crypto API if available,
 * with a mathematically sound fallback for older/insecure environments.
 */
function generateUUIDv4(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    // Standard secure randomUUID
    if (typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    // Fallback using sub-API
    const typedArray = new Uint32Array(4);
    window.crypto.getRandomValues(typedArray);
    const hex = Array.from(typedArray).map(num => num.toString(16).padStart(8, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }
  
  // Math.random() fallback - purely for absolute safety in extremely legacy environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Helper to generate a standardized device short token format
 * aligned with the "DVC-XXXX" structure but derived from a secure source.
 */
function generateDeviceToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  let token = '';
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(4);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < array.length; i++) {
      token += chars.charAt(array[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return `DVC-${token}`;
}

/**
 * Gather non-invasive environmental metadata properties of the device.
 */
function collectMetadata(): { platform: string; browser: string; resolution: string; isPWA: boolean } {
  let platform = 'Unknown OS';
  let browser = 'Unknown Browser';
  let resolution = 'Unknown Resolution';
  let isPWA = false;

  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent;

    // Detect Platform
    if (/iPhone|iPad|iPod/i.test(ua)) {
      platform = 'iOS';
    } else if (/Android/i.test(ua)) {
      platform = 'Android';
    } else if (/Windows NT/i.test(ua)) {
      platform = 'Windows';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      platform = 'macOS';
    } else if (/Linux/i.test(ua)) {
      platform = 'Linux';
    }

    // Detect Browser
    if (/Edg/i.test(ua)) {
      browser = 'Edge';
    } else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
      browser = 'Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = 'Safari';
    } else if (/Firefox/i.test(ua)) {
      browser = 'Firefox';
    } else if (/OPR|Opera/i.test(ua)) {
      browser = 'Opera';
    }

    // Detect Resolution
    if (window.screen) {
      resolution = `${window.screen.width}x${window.screen.height}`;
    }

    // Detect Standalone (PWA Installed) Mode
    isPWA = window.matchMedia('(display-mode: standalone)').matches || 
            (navigator as any).standalone === true;
  }

  return { platform, browser, resolution, isPWA };
}

export const DeviceIdentityService = {
  /**
   * Initializes or retrieves the persistent unique device signature.
   * Utilizes IndexedDB as primary and localStorage as double-fallback backup.
   */
  async getDeviceSignature(): Promise<DeviceSignature> {
    const backupKeySignature = 'rcm_device_signature_v1';
    const backupKeyToken = 'rcm_device_token';

    let cachedSignature: DeviceSignature | null = null;
    let fallbackToken: string | null = null;

    // 1. Check IndexedDB first
    try {
      cachedSignature = await getValueIDB<DeviceSignature>(backupKeySignature);
    } catch (e) {
      console.error('Failed to query IndexedDB for device signature', e);
    }

    // 2. Check LocalStorage fallback
    let localStorageSignatureStr: string | null = null;
    try {
      localStorageSignatureStr = localStorage.getItem(backupKeySignature);
      fallbackToken = localStorage.getItem(backupKeyToken);
    } catch (e) {
      console.warn('LocalStorage is blocked or unavailable', e);
    }

    let localStorageSignature: DeviceSignature | null = null;
    if (localStorageSignatureStr) {
      try {
        localStorageSignature = JSON.parse(localStorageSignatureStr);
      } catch (err) {
        console.warn('Error parsing JSON from localStorage signature', err);
      }
    }

    // 3. Resolve identity based on best available data
    let resolvedId = '';
    let resolvedToken = '';
    let createdAt = new Date().toISOString();

    if (cachedSignature) {
      resolvedId = cachedSignature.deviceId;
      resolvedToken = cachedSignature.deviceToken;
      createdAt = cachedSignature.createdAt;
    } else if (localStorageSignature) {
      resolvedId = localStorageSignature.deviceId;
      resolvedToken = localStorageSignature.deviceToken;
      createdAt = localStorageSignature.createdAt;
    } else {
      // Create new identity keys
      resolvedId = generateUUIDv4();
      
      // Crucial: check if we have an existing old rcm_device_token in localStorage (e.g., from an update)
      // and preserve it so we don't lock existing users out!
      if (fallbackToken && fallbackToken.startsWith('DVC-')) {
        resolvedToken = fallbackToken;
      } else {
        resolvedToken = generateDeviceToken();
      }
    }

    // Gather latest real-time environmental metadata
    const meta = collectMetadata();

    const currentSignature: DeviceSignature = {
      deviceId: resolvedId,
      deviceToken: resolvedToken,
      platform: meta.platform,
      browser: meta.browser,
      resolution: meta.resolution,
      isPWA: meta.isPWA,
      createdAt
    };

    // 4. Double backup writes to guarantee persistence
    try {
      await setValueIDB(backupKeySignature, currentSignature);
    } catch (e) {
      console.warn('Failed to write to IndexedDB store', e);
    }

    try {
      localStorage.setItem(backupKeySignature, JSON.stringify(currentSignature));
      localStorage.setItem(backupKeyToken, resolvedToken);
    } catch (e) {
      console.warn('Failed to backup write to localStorage', e);
    }

    return currentSignature;
  },

  /**
   * Directly get the cached device token (DVC-XXXX) synchronously if possible,
   * falling back to standard format quickly. Useful for non-async modules.
   */
  getDeviceTokenSync(): string {
    try {
      const cached = localStorage.getItem('rcm_device_token');
      if (cached && cached.startsWith('DVC-')) {
        return cached;
      }
    } catch (e) {
      // Ignored
    }
    return 'DVC-STDC';
  }
};
