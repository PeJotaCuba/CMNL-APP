import { User } from '../types';
import { DeviceIdentityService } from '../src/services/DeviceIdentityService';

export const cryptoUtils = {
  // Generar par de claves ECDSA
  async generateKeyPair() {
    return await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true, // extractable
      ["sign", "verify"]
    );
  },

  // Exportar clave para envío
  async exportPublicKey(key: CryptoKey) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  },

  // Importar clave privada guardada
  async exportPrivateKey(key: CryptoKey) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  },

  async signData(data: string, privateKeyBase64: string) {
    const binaryKey = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const signature = await window.crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      privateKey,
      encodedData
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
};

export const generateDigitalSignature = (certData: any) => {
  if (!certData) return "NO_CERT";
  
  // Safe fallbacks for objects to prevent null reference crashes when destructured
  const userData = certData.userData || {};
  const contracts = certData.contracts || {};
  
  const fullName = userData.fullName || "";
  const ci = userData.ci || "";
  const tomo = userData.tomo || "";
  const folio = userData.folio || "";

  // Helper to normalize and remove accents
  const normalizeText = (str: string) => {
    return str
      .slice()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  };

  const cleanName = normalizeText(fullName).trim();
  const nameParts = cleanName.split(/\s+/).filter(Boolean);

  // Extract first name, first apellido, second apellido
  let firstName = "USUARIO";
  let firstApellido = "APELLIDOUNO";
  let secondApellido = "APELLIDODOS";

  if (nameParts.length >= 3) {
    firstName = nameParts[0];
    secondApellido = nameParts[nameParts.length - 1];
    firstApellido = nameParts[nameParts.length - 2];
  } else if (nameParts.length === 2) {
    firstName = nameParts[0];
    firstApellido = nameParts[1];
    secondApellido = "";
  } else if (nameParts.length === 1) {
    firstName = nameParts[0];
    firstApellido = "";
    secondApellido = "";
  }

  // Extract specialties cleanly list
  let specialties: string[] = [];
  if (contracts && Object.keys(contracts).length > 0) {
    specialties = Object.keys(contracts);
  } else if (certData.specialties && Array.isArray(certData.specialties)) {
    specialties = certData.specialties;
  } else if (userData.specialties) {
    specialties = Array.isArray(userData.specialties) ? userData.specialties : [userData.specialties];
  } else if (userData.specialty) {
    specialties = typeof userData.specialty === 'string' 
      ? userData.specialty.split(/[\/,;\+]/).map((s: string) => s.trim())
      : [];
  }

  const cleanedSpecs = specialties
    .map(s => normalizeText(s).replace(/[^A-Z]/g, ''))
    .filter(Boolean);

  if (cleanedSpecs.length === 0) {
    cleanedSpecs.push("TRABAJADOR");
  }

  // Part 4 letters of spec 1
  const part4Spec = cleanedSpecs[0].substring(0, 4);

  // Part 6 letters of spec 2, or last 5 of spec 1 if only one spec exists
  let part6Spec = "";
  if (cleanedSpecs.length > 1) {
    part6Spec = cleanedSpecs[1].substring(0, 6);
  } else {
    const uniqueSpec = cleanedSpecs[0];
    part6Spec = uniqueSpec.length >= 5 ? uniqueSpec.substring(uniqueSpec.length - 5) : uniqueSpec;
  }

  // Numeric details
  const tomoClean = String(tomo).replace(/[^0-9]/g, '') || "0";
  const folioClean = String(folio).replace(/[^0-9]/g, '') || "0";
  const ciClean = String(ci).replace(/[^0-9]/g, '') || "000000";
  const ci6 = ciClean.substring(0, 6).padEnd(6, '0');

  // Contract numbers accumulation
  const contractVals = Object.values(contracts || {})
    .map(v => String(v).replace(/[^0-9]/g, ''))
    .join('');

  let contractNums = contractVals;
  if (!contractNums) {
    const c1 = String(userData.contract1 || '').replace(/[^0-9]/g, '');
    const c2 = String(userData.contract2 || '').replace(/[^0-9]/g, '');
    contractNums = c1 + c2;
  }
  if (!contractNums) {
    contractNums = "00";
  }

  // DateTime continuous format: YYYYMMDDHHmm
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dateStrContinuous = `${YYYY}${MM}${DD}${HH}${mm}`;
  const dvcId = DeviceIdentityService.getDeviceTokenSync();

  // Assemble according to exact order:
  // [First name]-[4 chars spec][Tomo][6 chars/last 5 chars spec][Folio]%[Second Apellido]#[CI-6]@[Contracts]%[First Apellido]&[DateTime Continuous]%ID:[DVC]
  return `${firstName}-${part4Spec}${tomoClean}${part6Spec}${folioClean}%${secondApellido}#${ci6}@${contractNums}%${firstApellido}&${dateStrContinuous}%ID:${dvcId}`;
};

export const formatDigitalSignatureForDocuments = (signatureString: string): string[] => {
  if (!signatureString) return [];
  
  // Try to locate the % symbols to split exactly into lines
  const parts = signatureString.split('%');
  if (parts.length >= 3) {
    const line1 = parts[0] + '%';
    const line2 = parts[1] + '%';
    const line3 = parts[2];
    const lines = [line1, line2, line3];
    if (parts.length > 3) {
      lines.push(parts.slice(3).join('%'));
    }
    return lines;
  }
  
  // Safe chunking fallback
  const len = signatureString.length;
  if (len <= 20) return [signatureString];
  const chunk = Math.ceil(len / 3);
  return [
    signatureString.substring(0, chunk),
    signatureString.substring(chunk, chunk * 2),
    signatureString.substring(chunk * 2)
  ].filter(Boolean);
};

export const getStoredCertificate = (userId: string) => {
    const certStr = localStorage.getItem(`cmnl_cert_${userId}`);
    return certStr ? JSON.parse(certStr) : null;
};

export const getStoredPrivateKey = (userId: string) => {
    return localStorage.getItem(`cmnl_sk_${userId}`);
};

export const getStoredPassword = (userId: string) => {
    return localStorage.getItem(`cmnl_pass_${userId}`);
};
