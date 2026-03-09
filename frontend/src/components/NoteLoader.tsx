import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAccount } from "@starknet-react/core";
import {
  FaSpinner,
  FaUpload,
  FaCloudDownloadAlt,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import { RiEyeOffFill, RiArrowRightLine } from "react-icons/ri";
import { inputStyle, btnPrimary } from "../views/home/shared";
import { getNoteFromCid, type NoteData } from "../helpers/get_note";

interface NoteLoaderProps {
  /** Called when a valid note is confirmed and ready to use */
  onNote: (note: NoteData) => void;
}

/**
 * Drop-in note loader used by Withdraw, Yield, and Swap tabs.
 *
 * Three ways to load a note:
 *   1. Paste IPFS CID → decrypt with deposit wallet (encrypted IPFS backup)
 *   2. Paste raw JSON manually
 *   3. Upload umbra-note.json or umbra-recovery.json
 *
 * After IPFS decryption, shows plaintext fields + switch-wallet warning
 * before confirming and passing the note upstream via onNote().
 */
export default function NoteLoader({ onNote }: NoteLoaderProps) {
  const { account } = useAccount();

  const [cid, setCid] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [decryptedNote, setDecryptedNote] = useState<NoteData | null>(null);
  const [copied, setCopied] = useState(false);
  const [rawJson, setRawJson] = useState("");

  // ── IPFS fetch + decrypt ────────────────────────────────────────────────
  const handleFetchNote = async () => {
    if (!account || !cid.trim()) return;
    setFetchLoading(true);
    setDecryptedNote(null);
    try {
      const note = await getNoteFromCid(account, cid.trim());
      setDecryptedNote(note);
      toast.success("Note decrypted! Switch to your withdrawal wallet.");
    } catch (err: any) {
      toast.error(
        err?.message ?? "Failed to decrypt — wrong wallet or invalid CID.",
      );
    } finally {
      setFetchLoading(false);
    }
  };

  // ── Confirm: pass note upstream and clear state ─────────────────────────
  const confirmNote = () => {
    if (!decryptedNote) return;
    setRawJson(JSON.stringify(decryptedNote, null, 2));
    onNote(decryptedNote);
    setDecryptedNote(null);
    setCid("");
  };

  const copyNote = () => {
    if (!decryptedNote) return;
    navigator.clipboard.writeText(JSON.stringify(decryptedNote, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Paste: fire onNote when all three fields present ───────────────────
  const handleRawChange = (val: string) => {
    setRawJson(val);
    try {
      const parsed = JSON.parse(val);
      if (parsed.nullifier && parsed.secret && parsed.commitment) {
        onNote(parsed as NoteData);
      }
    } catch {}
  };

  // ── File upload: umbra-note.json or umbra-recovery.json ─────────────────
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        // umbra-recovery.json: { cid, encrypted_with } — pre-fill CID
        if (parsed.cid && !parsed.nullifier) {
          setCid(parsed.cid);
          toast.info(
            `Recovery file loaded — CID pre-filled. Connect wallet "${parsed.encrypted_with?.slice(0, 10)}…" to decrypt.`,
          );
          return;
        }
        // umbra-note.json: { nullifier, secret, commitment }
        if (parsed.nullifier && parsed.secret && parsed.commitment) {
          setRawJson(JSON.stringify(parsed, null, 2));
          onNote(parsed as NoteData);
          toast.success("Note loaded.");
          return;
        }
        toast.error("Unrecognised file format.");
      } catch {
        toast.error("Could not parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* ── IPFS recovery ── */}
      <div
        style={{
          background: "#111118",
          border: "1px solid #1e1e2e",
          borderRadius: 10,
          padding: "1.1rem 1.2rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <label style={sectionLabel}>Recover from IPFS</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={cid}
            onChange={(e) => {
              setCid(e.target.value);
              setDecryptedNote(null);
            }}
            placeholder="Paste IPFS CID…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={handleFetchNote}
            disabled={fetchLoading || !cid.trim() || !account}
            style={{
              ...btnPrimary(!!(cid.trim() && !fetchLoading && account)),
              width: "auto",
              padding: "0.6rem 1rem",
              flexShrink: 0,
            }}
          >
            {fetchLoading ? (
              <FaSpinner
                size={11}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <FaCloudDownloadAlt size={13} />
            )}
            &nbsp;{fetchLoading ? "Decrypting…" : "Decrypt"}
          </button>
        </div>
        <p style={{ color: "#2a2a3a", fontSize: "0.6rem", margin: 0 }}>
          Connect the wallet used to deposit · or upload umbra-recovery.json
          below
        </p>
      </div>

      {/* ── Decrypted note reveal ── */}
      {decryptedNote && (
        <div
          style={{
            background: "#0a0a0f",
            border: "2px solid rgba(255,200,0,0.4)",
            borderRadius: 10,
            padding: "1.1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <RiEyeOffFill size={15} color="#ffc800" />
            <div>
              <div
                style={{
                  color: "#ffc800",
                  fontSize: "0.75rem",
                  fontWeight: 900,
                }}
              >
                Note decrypted
              </div>
              <div
                style={{
                  color: "#555",
                  fontSize: "0.58rem",
                  marginTop: "0.1rem",
                }}
              >
                Visible only in your browser — never sent anywhere
              </div>
            </div>
          </div>

          {(["nullifier", "secret", "commitment"] as const).map((key) => (
            <div
              key={key}
              style={{
                background: "#111118",
                border: "1px solid #1e1e2e",
                borderRadius: 7,
                padding: "0.55rem 0.8rem",
              }}
            >
              <div
                style={{
                  color: "#2a2a3a",
                  fontSize: "0.52rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: "0.25rem",
                }}
              >
                {key}
              </div>
              <div
                style={{
                  color: "#aaa",
                  fontSize: "0.63rem",
                  fontFamily: "'DM Mono', monospace",
                  wordBreak: "break-all",
                  lineHeight: 1.5,
                }}
              >
                {decryptedNote[key]}
              </div>
            </div>
          ))}

          <div
            style={{
              background: "rgba(255,200,0,0.06)",
              border: "1px solid rgba(255,200,0,0.2)",
              borderRadius: 8,
              padding: "0.85rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
            }}
          >
            <RiArrowRightLine
              size={16}
              color="#ffc800"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div
              style={{ fontSize: "0.68rem", color: "#888", lineHeight: 1.8 }}
            >
              <strong
                style={{
                  color: "#ffc800",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                ⚠ Switch to your withdrawal wallet before continuing
              </strong>
              Disconnect wallet A, connect wallet B, then click{" "}
              <strong style={{ color: "#fff" }}>"Use this note →"</strong>.
              <br />
              <span style={{ color: "#3a3a4a", fontSize: "0.6rem" }}>
                The on-chain transaction comes from wallet B — no link to wallet
                A.
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={copyNote}
              style={{
                background: "transparent",
                border: "1px solid #2a2a3a",
                borderRadius: 7,
                padding: "0.65rem",
                color: copied ? "#22c55e" : "#555",
                fontSize: "0.68rem",
                fontFamily: "'DM Mono', monospace",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              {copied ? <FaCheck size={10} /> : <FaCopy size={10} />}
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={confirmNote}
              style={{
                background: "rgba(255,200,0,0.1)",
                border: "1px solid rgba(255,200,0,0.35)",
                borderRadius: 7,
                padding: "0.65rem",
                color: "#ffc800",
                fontSize: "0.7rem",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              <RiArrowRightLine size={12} />
              Use this note →
            </button>
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <div style={{ flex: 1, height: 1, background: "#1e1e2e" }} />
        <span
          style={{
            color: "#2a2a3a",
            fontSize: "0.57rem",
            letterSpacing: "0.12em",
          }}
        >
          OR PASTE / UPLOAD
        </span>
        <div style={{ flex: 1, height: 1, background: "#1e1e2e" }} />
      </div>

      {/* ── Manual paste + file upload ── */}
      <div
        style={{
          background: "#111118",
          border: "1px solid #1e1e2e",
          borderRadius: 10,
          padding: "1.1rem 1.2rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <label style={sectionLabel}>Paste note JSON</label>
        <textarea
          value={rawJson}
          onChange={(e) => handleRawChange(e.target.value)}
          placeholder='{ "nullifier": "0x...", "secret": "0x...", "commitment": "0x..." }'
          rows={3}
          style={{
            ...inputStyle,
            resize: "none",
            lineHeight: 1.7,
            color: rawJson ? "#fff" : "#2a2a3a",
            fontSize: "0.7rem",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#ffc800";
            e.target.style.boxShadow = "0 0 0 2px rgba(255,200,0,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#2a2a3a";
            e.target.style.boxShadow = "none";
          }}
        />
        <label
          htmlFor="note-loader-file"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.6rem",
            border: "1px dashed #1e1e2e",
            borderRadius: 8,
            color: "#3a3a4a",
            fontSize: "0.66rem",
            cursor: "pointer",
            letterSpacing: "0.08em",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#555")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e2e")}
        >
          <FaUpload size={10} />
          Upload umbra-note.json or umbra-recovery.json
          <input
            id="note-loader-file"
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  color: "#3a3a4a",
  fontSize: "0.58rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
};
