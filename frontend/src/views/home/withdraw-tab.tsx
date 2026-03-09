import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAccount, useContract, useReadContract } from "@starknet-react/core";
import { FaSpinner } from "react-icons/fa";
import { RiShieldKeyholeFill } from "react-icons/ri";
import { poseidon2Hash } from "@zkpassport/poseidon2";
import abi from "../../assets/json/abi";
import { CONTRACT_ADDRESS } from "../../utils/constants";
import { merkleTree } from "../../helpers/merkle_tree";
import { useZkVerifier } from "../../helpers/gen_proof";
import { useIndexerDeposits } from "../../helpers/use_indexer_deposits";
import { btnPrimary, btnGhost, inputStyle } from "./shared";
import { assertReceiptSuccess } from "../../utils/helpers";
import { type NoteData } from "../../helpers/get_note";
import NoteLoader from "../../components/NoteLoader";

export default function WithdrawTab() {
  const { address, account } = useAccount();
  const { contract } = useContract({ abi, address: CONTRACT_ADDRESS });
  const { generateProof } = useZkVerifier();
  const { fetchAllCommitments } = useIndexerDeposits();

  const [note, setNote] = useState<NoteData | null>(null);
  const [recipient, setRecipient] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const { data: wbtcDenom } = useReadContract({
    abi,
    address: CONTRACT_ADDRESS,
    functionName: "wBTC_denomination",
    args: [],
  });

  const denomDisplay = wbtcDenom
    ? `${(Number(wbtcDenom as bigint) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 })} wBTC`
    : "—";

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !contract) return toast.error("Connect your wallet.");
    if (!note || !recipient.trim()) return;
    setWithdrawError(null);
    setWithdrawLoading(true);

    try {
      const commitments = await fetchAllCommitments();
      const noteCommitment = BigInt(note.commitment).toString();
      const tree = await merkleTree(commitments);
      const leafIndex = tree.getIndex(noteCommitment);
      if (leafIndex === -1)
        throw new Error("Commitment not found in deposit events");

      const merkleProof = tree.proof(leafIndex);
      const nullifierHash =
        "0x" + poseidon2Hash([BigInt(note.nullifier)]).toString(16);
      const recipientHash =
        "0x" + poseidon2Hash([BigInt(recipient)]).toString(16);

      const noirInput = {
        root: merkleProof.root.toString(),
        nullifier_hash: nullifierHash,
        recipient,
        recipient_hash: recipientHash,
        nullifier: note.nullifier,
        secret: note.secret,
        merkle_proof: merkleProof.pathElements.map((el: any) => el.toString()),
        is_even: merkleProof.pathIndices.map((el: any) => el % 2 === 0),
      };

      const toastId = toast.loading("Generating ZK proof…");
      const { callData } = await generateProof(noirInput, (message) => {
        toast.update(toastId, { render: message });
      });
      toast.update(toastId, {
        render: "Proof generated, submitting transaction...",
        isLoading: false,
        type: "success",
      });
      toast.dismiss(toastId);

      const populate = contract.populate("zk_withdraw_wbtc", [
        callData.slice(1),
        recipient,
      ]);
      await account.estimateInvokeFee([populate]);
      const tx = await account.execute([populate]);
      const receipt = await account.waitForTransaction(tx.transaction_hash);
      assertReceiptSuccess(receipt);
      toast.success("Withdrawn! wBTC sent to your wallet 🎉");
      setNote(null);
      setRecipient("");
    } catch (err: any) {
      const msg =
        err?.baseError?.data?.execution_error?.error ??
        err?.message ??
        String(err);
      toast.error(msg);
      setWithdrawError(msg);
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleWithdraw}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {/* Privacy notice */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          background: "rgba(255,200,0,0.04)",
          border: "1px solid rgba(255,200,0,0.1)",
          borderRadius: 10,
          padding: "1rem",
        }}
      >
        <RiShieldKeyholeFill
          size={16}
          color="#ffc800"
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <div style={{ fontSize: "0.67rem", color: "#555", lineHeight: 1.75 }}>
          A <span style={{ color: "#ffc800" }}>zero-knowledge proof</span> is
          generated locally. Your nullifier and secret never leave your browser.
          The on-chain verifier only sees the Garaga proof.
        </div>
      </div>

      {/* Note loader */}
      <NoteLoader onNote={(n) => setNote(n)} />

      {/* Note loaded confirmation */}
      {note && (
        <div
          style={{
            background: "rgba(34,197,94,0.04)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22c55e",
                flexShrink: 0,
              }}
            />
            <span
              style={{ color: "#22c55e", fontSize: "0.68rem", fontWeight: 700 }}
            >
              Note loaded
            </span>
            <span
              style={{
                color: "#3a3a4a",
                fontSize: "0.62rem",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {note.commitment.slice(0, 14)}…
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNote(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#3a3a4a",
              fontSize: "0.62rem",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Recipient */}
      <div
        style={{
          background: "#111118",
          border: "1px solid #1e1e2e",
          borderRadius: 10,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <label
          style={{
            color: "#3a3a4a",
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Recipient address
        </label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x… (ideally a fresh wallet)"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = "#ffc800";
            e.target.style.boxShadow = "0 0 0 2px rgba(255,200,0,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#2a2a3a";
            e.target.style.boxShadow = "none";
          }}
        />
        {address && !recipient && (
          <button
            type="button"
            onClick={() => setRecipient(address)}
            style={{ ...btnGhost, marginTop: 0 }}
          >
            Use connected wallet
          </button>
        )}
        <p
          style={{
            color: "#2a2a3a",
            fontSize: "0.62rem",
            margin: 0,
            letterSpacing: "0.06em",
          }}
        >
          ↗ Use a different wallet than your deposit address for maximum privacy
        </p>
      </div>

      {/* Payout summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,200,0,0.04)",
          border: "1px solid rgba(255,200,0,0.14)",
          borderRadius: 10,
          padding: "1rem 1.25rem",
        }}
      >
        <div>
          <div
            style={{
              color: "#3a3a4a",
              fontSize: "0.6rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "0.25rem",
            }}
          >
            You receive
          </div>
          <div
            style={{ color: "#ffc800", fontSize: "1.15rem", fontWeight: 900 }}
          >
            {denomDisplay}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: "#2a2a3a",
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "0.2rem",
            }}
          >
            via Pragma/Chainlink
          </div>
          <div style={{ color: "#3a3a4a", fontSize: "0.65rem" }}>
            BTC/USD ÷ STRK/USD
          </div>
        </div>
      </div>

      {/* Error */}
      {withdrawError && (
        <div
          style={{
            color: "#f87171",
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.18)",
            borderRadius: 8,
            padding: "0.85rem",
            fontSize: "0.72rem",
            wordBreak: "break-word",
            lineHeight: 1.6,
          }}
        >
          {withdrawError}
        </div>
      )}

      {!address && (
        <div
          style={{
            color: "#f59e0b",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: 8,
            padding: "0.75rem",
            fontSize: "0.75rem",
            textAlign: "center",
          }}
        >
          Connect your wallet to withdraw
        </div>
      )}

      <button
        type="submit"
        disabled={!note || !recipient.trim() || withdrawLoading || !address}
        style={btnPrimary(
          !!note && !!recipient.trim() && !withdrawLoading && !!address,
        )}
      >
        {withdrawLoading ? (
          <>
            <FaSpinner
              size={13}
              style={{ animation: "spin 1s linear infinite" }}
            />{" "}
            Generating ZK proof…
          </>
        ) : (
          <>
            <RiShieldKeyholeFill size={14} /> Generate proof & withdraw
          </>
        )}
      </button>

      <p
        style={{
          color: "#2a2a3a",
          fontSize: "0.65rem",
          textAlign: "center",
          margin: 0,
          letterSpacing: "0.06em",
        }}
      >
        Proof generated locally · verified by Garaga on Starknet
      </p>
    </form>
  );
}
