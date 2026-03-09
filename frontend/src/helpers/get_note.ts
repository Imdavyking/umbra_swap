import { decryptNote } from "./encrypt";

const PINATA_GATEWAY =
  import.meta.env.VITE_PINATA_GATEWAY ?? "https://gateway.pinata.cloud";

export interface NoteData {
  nullifier: string;
  secret: string;
  commitment: string;
}

/**
 * Fetch an encrypted note from IPFS and decrypt it with the given account.
 * The account must be the same one used to encrypt at deposit time.
 */
export async function getNoteFromCid(
  account: any,
  cid: string,
): Promise<NoteData> {
  const res = await fetch(`${PINATA_GATEWAY}/ipfs/${cid.trim()}`);
  if (!res.ok) throw new Error(`IPFS gateway error: ${res.status}`);

  const json = await res.json();
  if (!json.encrypted)
    throw new Error("Invalid IPFS payload — missing encrypted field");

  return decryptNote(account, json.encrypted);
}
