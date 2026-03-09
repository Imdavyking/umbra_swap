import { encode } from "starknet";

export async function decryptNote(
  account: any,
  encrypted: string,
): Promise<{ nullifier: string; secret: string; commitment: string }> {
  const signature = await account.signMessage({
    domain: { name: "Umbra", version: "1", chainId: "SN_SEPOLIA" },
    types: { Message: [{ name: "action", type: "felt" }] },
    primaryType: "Message",
    message: {
      action: encode.addHexPrefix(Buffer.from("decrypt_note").toString("hex")),
    },
  });
  const rawKey = signature[0].slice(2).padStart(64, "0");
  const keyBuffer = Buffer.from(rawKey, "hex");
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    "AES-GCM",
    false,
    ["decrypt"],
  );

  const { iv, data } = JSON.parse(encrypted);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    cryptoKey,
    new Uint8Array(data),
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}
export async function encryptNote(
  account: any,
  note: { nullifier: string; secret: string; commitment: string },
): Promise<string> {
  const signature = await account.signMessage({
    domain: { name: "Umbra", version: "1", chainId: "SN_SEPOLIA" },
    types: { Message: [{ name: "action", type: "felt" }] },
    primaryType: "Message",
    message: {
      action: encode.addHexPrefix(Buffer.from("decrypt_note").toString("hex")),
    },
  });
  // Derive AES key from signature
  const rawKey = signature[0].slice(2).padStart(64, "0");
  const keyBuffer = Buffer.from(rawKey, "hex");
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(JSON.stringify(note)),
  );
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  });
}
