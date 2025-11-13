import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import {
	handleToEnsName,
	resolveEnsToPredictedAddress,
	getSepoliaBalance,
} from "../../utils/ens";

export default function Pay() {
	const [handle, setHandle] = useState("");
	const ensName = useMemo(() => handleToEnsName(handle), [handle]);
	const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null);
	const [isResolving, setIsResolving] = useState(false);
	const [balance, setBalance] = useState<bigint | null>(null);
	const [showDetails, setShowDetails] = useState(false);
	const [copiedItem, setCopiedItem] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function run() {
			setIsResolving(true);
			setResolvedAddress(null);
			setBalance(null);
			const addr = await resolveEnsToPredictedAddress(ensName);
			if (cancelled) return;
			setResolvedAddress(addr);
			if (addr) {
				const bal = await getSepoliaBalance(addr);
				if (!cancelled) setBalance(bal);
			}
			setIsResolving(false);
		}
		if (ensName) run();
		else {
			setResolvedAddress(null);
			setBalance(null);
		}
		return () => {
			cancelled = true;
		};
	}, [ensName]);

	const onCopy = async (val: string, label: string) => {
		try {
			await navigator.clipboard.writeText(val);
			setCopiedItem(label);
			setTimeout(() => setCopiedItem(null), 2000);
		} catch {
			// ignore
		}
	};

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px",
			}}
		>
			<div style={{ width: "100%", maxWidth: "680px", display: "grid", gap: "20px" }}>
				<header style={{ textAlign: "center" }}>
					<h1 style={{ fontSize: "32px", margin: 0, fontWeight: 700 }}>
						Send money to any X profile
					</h1>
					<p className="help-text" style={{ marginTop: "8px", fontSize: "15px" }}>
						Support your favorite creators with just their handle
					</p>
				</header>

				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "16px",
						padding: "24px",
						display: "grid",
						gap: "18px",
						boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
					}}
				>
					<div>
						<label htmlFor="handle" style={{ fontWeight: 500, fontSize: "15px" }}>
							Enter X handle
						</label>
						<input
							id="handle"
							type="text"
							placeholder="e.g., @vitalik"
							value={handle}
							onChange={(e) => setHandle(e.target.value)}
							style={{
								width: "100%",
								padding: "12px 14px",
								borderRadius: "10px",
								border: "1px solid var(--border)",
								background: "var(--background)",
								color: "var(--text)",
								fontSize: "15px",
								marginTop: "8px",
							}}
						/>
					</div>

					{ensName && resolvedAddress && (
						<div
							style={{
								padding: "20px",
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "12px",
								display: "grid",
								gap: "16px",
								boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
							}}
						>
							<div style={{ textAlign: "center" }}>
								<div className="help-text" style={{ marginBottom: "6px" }}>
									Send to
								</div>
								<div
									style={{
										fontSize: "20px",
										fontWeight: 600,
										fontFamily: "ui-monospace, monospace",
										marginBottom: "4px",
									}}
								>
									{ensName}
								</div>
								{balance != null && (
									<div className="help-text" style={{ fontSize: "13px" }}>
										Current balance: {Number(formatEther(balance)).toFixed(4)} ETH
									</div>
								)}
							</div>

							<div style={{ display: "grid", gap: "10px" }}>
								<div style={{ fontWeight: 500, marginBottom: "4px", fontSize: "14px" }}>
									Choose payment method
								</div>

								{/* Crypto - Active */}
								<button
									onClick={() => onCopy(resolvedAddress, "crypto")}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "16px",
										background: "rgba(96, 165, 250, 0.1)",
										border: "2px solid rgb(96, 165, 250)",
										borderRadius: "12px",
										cursor: "pointer",
										transition: "all 0.2s",
										color: "var(--text)",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div
											style={{
												width: "40px",
												height: "40px",
												borderRadius: "8px",
												background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "20px",
											}}
										>
											⟠
										</div>
										<div style={{ textAlign: "left" }}>
											<div style={{ fontWeight: 500 }}>Ethereum</div>
											<div className="help-text" style={{ fontSize: "12px" }}>
												Via ENS name or wallet
											</div>
										</div>
									</div>
									<div style={{ fontSize: "13px", color: "rgb(96, 165, 250)", fontWeight: 500 }}>
										{copiedItem === "crypto" ? "✓ Copied" : "Copy"}
									</div>
								</button>

								{/* PayPal - Coming Soon */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "16px",
										background: "rgba(148, 163, 184, 0.1)",
										border: "1px solid rgba(148, 163, 184, 0.3)",
										borderRadius: "12px",
										opacity: 0.6,
										cursor: "not-allowed",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div
											style={{
												width: "40px",
												height: "40px",
												borderRadius: "8px",
												background: "#0070ba",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "white",
												fontWeight: "bold",
												fontSize: "12px",
											}}
										>
											PP
										</div>
										<div style={{ textAlign: "left" }}>
											<div style={{ fontWeight: 500 }}>PayPal</div>
											<div className="help-text" style={{ fontSize: "12px" }}>
												Send via PayPal
											</div>
										</div>
									</div>
									<div
										style={{
											fontSize: "11px",
											padding: "4px 8px",
											background: "rgba(234, 179, 8, 0.15)",
											borderRadius: "6px",
											color: "#a16207",
											fontWeight: 500,
										}}
									>
										Coming Soon
									</div>
								</div>

								{/* Card - Coming Soon */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "16px",
										background: "rgba(148, 163, 184, 0.1)",
										border: "1px solid rgba(148, 163, 184, 0.3)",
										borderRadius: "12px",
										opacity: 0.6,
										cursor: "not-allowed",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div
											style={{
												width: "40px",
												height: "40px",
												borderRadius: "8px",
												background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "18px",
											}}
										>
											💳
										</div>
										<div style={{ textAlign: "left" }}>
											<div style={{ fontWeight: 500 }}>Credit / Debit Card</div>
											<div className="help-text" style={{ fontSize: "12px" }}>
												Pay with card via Stripe
											</div>
										</div>
									</div>
									<div
										style={{
											fontSize: "11px",
											padding: "4px 8px",
											background: "rgba(234, 179, 8, 0.15)",
											borderRadius: "6px",
											color: "#a16207",
											fontWeight: 500,
										}}
									>
										Coming Soon
									</div>
								</div>

								{/* Daimo - Coming Soon */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "16px",
										background: "rgba(148, 163, 184, 0.1)",
										border: "1px solid rgba(148, 163, 184, 0.3)",
										borderRadius: "12px",
										opacity: 0.6,
										cursor: "not-allowed",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div
											style={{
												width: "40px",
												height: "40px",
												borderRadius: "8px",
												background: "#10b981",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "white",
												fontWeight: "bold",
												fontSize: "16px",
											}}
										>
											D
										</div>
										<div style={{ textAlign: "left" }}>
											<div style={{ fontWeight: 500 }}>Daimo</div>
											<div className="help-text" style={{ fontSize: "12px" }}>
												Pay with USDC
											</div>
										</div>
									</div>
									<div
										style={{
											fontSize: "11px",
											padding: "4px 8px",
											background: "rgba(234, 179, 8, 0.15)",
											borderRadius: "6px",
											color: "#a16207",
											fontWeight: 500,
										}}
									>
										Coming Soon
									</div>
								</div>
							</div>

							<button
								className="link-cta"
								onClick={() => setShowDetails(!showDetails)}
								style={{ justifyContent: "center", marginTop: "4px" }}
							>
								{showDetails ? "Hide" : "Show"} technical details
							</button>

							{showDetails && (
								<div
									style={{
										marginTop: "8px",
										padding: "12px",
										background: "var(--card)",
										borderRadius: "8px",
										fontSize: "13px",
									}}
								>
									<div style={{ marginBottom: "8px" }}>
										<div className="help-text" style={{ marginBottom: 4 }}>
											ENS Name
										</div>
										<div
											style={{
												fontFamily: "ui-monospace, monospace",
												wordBreak: "break-all",
											}}
										>
											{ensName}
										</div>
									</div>
									<div>
										<div className="help-text" style={{ marginBottom: 4 }}>
											Ethereum Address (Sepolia Testnet)
										</div>
										<div
											style={{
												fontFamily: "ui-monospace, monospace",
												wordBreak: "break-all",
											}}
										>
											{resolvedAddress}
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{ensName && isResolving && (
						<div
							style={{
								padding: "16px",
								textAlign: "center",
								color: "var(--muted)",
							}}
						>
							Looking up address...
						</div>
					)}

					{ensName && !isResolving && !resolvedAddress && (
						<div
							style={{
								padding: "16px",
								background: "rgba(234, 179, 8, 0.08)",
								border: "1px solid rgba(234, 179, 8, 0.2)",
								borderRadius: "12px",
								textAlign: "center",
							}}
						>
							<div style={{ marginBottom: "6px" }}>⚠️ Handle not found</div>
							<div className="help-text">
								This X handle hasn't set up their account yet
							</div>
						</div>
					)}
				</div>

			</div>
		</div>
	);
}


