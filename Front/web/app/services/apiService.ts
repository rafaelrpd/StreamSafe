// JSON -> GZip -> Base64 -> AES‑CBC -> concat(IV|cipher) -> Base64 -> bytes
import CryptoJS from "crypto-js";
import pako from "pako";

const AES_KEY = process.env.NEXT_PUBLIC_AES_KEY as string;

if (!AES_KEY || AES_KEY.length !== 32) {
  throw new Error("AES Key must be defined and be 32 bytes long");
}

function bytesToWordArray(u8: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < u8.length; i++) {
    words[i >>> 2] |= u8[i] << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, u8.length);
}

function wordArrayToBytes(wa: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wa;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return u8;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from({ length: bin.length }, (_, i) => bin.charCodeAt(i));
}

function bytesToBase64(u8: Uint8Array): string {
  let bin = "";
  u8.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

class ApiService {
  async post<TReq, TRes>(url: string, payload: TReq): Promise<TRes> {
    const bodyBytes = this.compressAndEncrypt(JSON.stringify(payload));

    const bodyBuffer = bodyBytes.buffer.slice(
      bodyBytes.byteOffset,
      bodyBytes.byteOffset + bodyBytes.byteLength
    ) as ArrayBuffer;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob([bodyBuffer], { type: "application/octet-stream" }),
    });

    if (!resp.ok) throw new Error(`Failed to fetch: ${resp.statusText}`);

    const encryptedResp = new Uint8Array(await resp.arrayBuffer());
    const decrypted = this.decryptAndDecompress(encryptedResp);

    return JSON.parse(decrypted) as TRes;
  }

  async get<TRes>(url: string): Promise<TRes> {
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/octet-stream" },
    });

    if (!resp.ok) throw new Error(`Failed to fetch: ${resp.statusText}`);

    const encryptedResp = new Uint8Array(await resp.arrayBuffer());
    const decrypted = this.decryptAndDecompress(encryptedResp);

    return JSON.parse(decrypted) as TRes;
  }

  private compressAndEncrypt(json: string): Uint8Array {
    const gzBytes = pako.gzip(json);

    const gzB64 = bytesToBase64(gzBytes);

    const key = CryptoJS.enc.Utf8.parse(AES_KEY);
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(gzB64, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const ivBytes = wordArrayToBytes(iv).slice(0, 16);
    const cipherBytes = wordArrayToBytes(encrypted.ciphertext);
    const payload = new Uint8Array(ivBytes.length + cipherBytes.length);
    payload.set(ivBytes);
    payload.set(cipherBytes, ivBytes.length);

    const allB64 = bytesToBase64(payload);
    return new TextEncoder().encode(allB64);
  }

  private decryptAndDecompress(payloadBytes: Uint8Array): string {
    const allB64 = new TextDecoder().decode(payloadBytes);

    const allBytes = base64ToBytes(allB64);
    const ivBytes = allBytes.slice(0, 16);
    const cipherBytes = allBytes.slice(16);

    const key = CryptoJS.enc.Utf8.parse(AES_KEY);
    const ivWA = bytesToWordArray(ivBytes);
    const cipherWA = bytesToWordArray(cipherBytes);

    const decryptedWA = CryptoJS.AES.decrypt(
      { ciphertext: cipherWA } as CryptoJS.lib.CipherParams,
      key,
      { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    const gzB64 = CryptoJS.enc.Utf8.stringify(decryptedWA);

    const gzBytes = base64ToBytes(gzB64);
    const jsonBytes = pako.ungzip(gzBytes);
    return new TextDecoder().decode(jsonBytes);
  }
}

export const apiService = new ApiService();
