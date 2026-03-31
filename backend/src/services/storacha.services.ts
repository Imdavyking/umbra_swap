import { create, type Client } from "@storacha/client";
import * as Signer from "@ucanto/principal/ed25519";
import * as Proof from "@storacha/client/proof";

import dotenv from "dotenv";
dotenv.config();

let client: Client | null = null;

const getClient = async (): Promise<Client> => {
  if (client) return client;

  const principal = Signer.parse(process.env.W3UP_KEY!);
  client = await create({ principal });
  const proof = await Proof.parse(process.env.W3UP_PROOF!);
  const space = await client.addSpace(proof);
  await client.setCurrentSpace(space.did());

  return client;
};

export const pinNote = async (encrypted: string): Promise<string | null> => {
  try {
    const c = await getClient();
    const blob = new Blob([JSON.stringify({ encrypted })], {
      type: "application/json",
    });
    const file = new File([blob], "note.json", { type: "application/json" });
    const cid = await c.uploadFile(file);

    return cid.toString();
  } catch (err) {
    console.error(err);
    return null;
  }
};
