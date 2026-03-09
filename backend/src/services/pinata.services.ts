import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: "https://emerald-odd-bee-965.mypinata.cloud",
});

export const uploadToPinata = async (file: File) => {
  try {
    const { cid } = await pinata.upload.public.file(file);
    const url = await pinata.gateways.public.convert(cid);
    return url;
  } catch (_) {
    return null;
  }
};

export const pinNote = async (encrypted: string): Promise<string | null> => {
  try {
    const { cid } = await pinata.upload.public.json({ encrypted });
    return cid;
  } catch (_) {
    return null;
  }
};
