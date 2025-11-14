import { useEffect, useMemo, useState } from "react";
import {
	handleToEnsName,
	resolveEnsToPredictedAddress,
} from "../../utils/ens";
import { useDebounce } from "../../hooks/useDebounce";

export default function Pay() {
	const [handle, setHandle] = useState("");
	const debouncedHandle = useDebounce(handle, 500);
	const ensName = useMemo(() => handleToEnsName(debouncedHandle), [debouncedHandle]);
	const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null);
	const [isResolving, setIsResolving] = useState(false);
	const [showDetails, setShowDetails] = useState(false);
	const [copiedItem, setCopiedItem] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function run() {
			setIsResolving(true);
			setResolvedAddress(null);
			const addr = await resolveEnsToPredictedAddress(ensName);
			if (cancelled) return;
			setResolvedAddress(addr);
			setIsResolving(false);
		}
		if (ensName) run();
		else {
			setResolvedAddress(null);
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
				padding: "40px 24px",
			}}
		>
			<div style={{ width: "100%", maxWidth: "720px", margin: "0 auto", display: "grid", gap: "32px" }}>
				{/* Hero Section */}
				<header style={{ textAlign: "center", paddingTop: "20px" }}>
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "12px",
							marginBottom: "20px",
							padding: "10px 20px",
							background: "rgba(96, 165, 250, 0.08)",
							borderRadius: "999px",
							border: "1px solid rgba(96, 165, 250, 0.2)",
						}}
					>
						<span style={{ fontSize: "14px", color: "var(--muted)" }}>Powered by</span>
						<img
							src="/ZKEmailLogo-light.svg"
							alt="ZK Email"
							style={{
								height: "20px",
							}}
						/>
					</div>
					<h1
						style={{
							fontSize: "clamp(32px, 5vw, 48px)",
							margin: "0 0 16px",
							fontWeight: 700,
							lineHeight: 1.2,
						}}
					>
						Send money to any
						<br />
						<span
							style={{
								background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
							}}
						>
							GitHub profile
						</span>
					</h1>
					<p
						style={{
							marginTop: "12px",
							fontSize: "17px",
							color: "var(--muted)",
							maxWidth: "480px",
							margin: "0 auto",
							lineHeight: 1.6,
						}}
					>
						Support creators, pay friends, or send tips — all using just their GitHub handle. No wallet needed.
					</p>

					{/* Feature badges */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "12px",
							justifyContent: "center",
							marginTop: "24px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								padding: "6px 14px",
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "999px",
								fontSize: "13px",
							}}
						>
							<span>⚡</span>
							<span>Instant</span>
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								padding: "6px 14px",
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "999px",
								fontSize: "13px",
							}}
						>
							<span>🔐</span>
							<span>Secure</span>
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								padding: "6px 14px",
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "999px",
								fontSize: "13px",
							}}
						>
							<span>🌍</span>
							<span>Global</span>
						</div>
					</div>
				</header>

				{/* Search Card */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "20px",
						padding: "28px",
						display: "grid",
						gap: "20px",
						boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
					}}
				>
					<div>
						<label
							htmlFor="handle"
							style={{
								fontWeight: 600,
								fontSize: "15px",
								display: "block",
								marginBottom: "10px",
							}}
						>
							Who do you want to send to?
						</label>
						<div style={{ position: "relative" }}>
							<div
								style={{
									position: "absolute",
									left: "16px",
									top: "50%",
									transform: "translateY(-50%)",
									fontSize: "20px",
									pointerEvents: "none",
								}}
							>
								🔍
							</div>
							<input
								id="handle"
								type="text"
								placeholder="Search GitHub handle (e.g., @octocat)"
								value={handle}
								onChange={(e) => setHandle(e.target.value)}
								style={{
									width: "100%",
									padding: "14px 14px 14px 48px",
									borderRadius: "12px",
									border: "2px solid var(--border)",
									background: "var(--background)",
									color: "var(--text)",
									fontSize: "16px",
									transition: "border-color 0.2s",
								}}
								onFocus={(e) => {
									e.target.style.borderColor = "rgb(96, 165, 250)";
								}}
								onBlur={(e) => {
									e.target.style.borderColor = "var(--border)";
								}}
							/>
						</div>
					</div>

					{ensName && resolvedAddress && (
						<div
							style={{
								padding: "24px",
								background: "linear-gradient(135deg, rgba(96, 165, 250, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
								border: "2px solid rgba(96, 165, 250, 0.2)",
								borderRadius: "16px",
								display: "grid",
								gap: "20px",
								animation: "slideIn 0.3s ease-out",
							}}
						>
							<div style={{ textAlign: "center" }}>
								<div
									style={{
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										width: "64px",
										height: "64px",
										borderRadius: "50%",
										background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
										marginBottom: "16px",
										fontSize: "32px",
									}}
								>
									✓
								</div>
								<div className="help-text" style={{ marginBottom: "8px", fontSize: "13px" }}>
									Send payment to
								</div>
								<div
									style={{
										fontSize: "24px",
										fontWeight: 700,
										fontFamily: "ui-monospace, monospace",
										marginBottom: "8px",
										color: "var(--text)",
									}}
								>
									{ensName}
								</div>
							</div>

							<div style={{ display: "grid", gap: "10px" }}>
								<div style={{ fontWeight: 500, marginBottom: "4px", fontSize: "14px" }}>
									Choose payment method
								</div>

								{/* Crypto - Active */}
								<div
									style={{
										padding: "16px",
										background: "rgba(96, 165, 250, 0.1)",
										border: "2px solid rgb(96, 165, 250)",
										borderRadius: "12px",
										color: "var(--text)",
									}}
								>
									<button
										onClick={() => onCopy(ensName, "crypto")}
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											width: "100%",
											cursor: "pointer",
											background: "transparent",
											border: "none",
											padding: 0,
											color: "inherit",
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

									<button
										className="link-cta"
										onClick={() => setShowDetails(!showDetails)}
										style={{ justifyContent: "center", marginTop: "12px", width: "100%" }}
									>
										{showDetails ? "Hide" : "Show"} wallet address
									</button>

									{showDetails && resolvedAddress && (
										<div
											style={{
												marginTop: "12px",
												padding: "12px",
												background: "rgba(0, 0, 0, 0.2)",
												borderRadius: "8px",
												fontSize: "13px",
											}}
										>
											<div className="help-text" style={{ marginBottom: 4, fontSize: "11px" }}>
												Wallet Address
											</div>
											<div
												style={{
													fontFamily: "ui-monospace, monospace",
													wordBreak: "break-all",
													fontSize: "12px",
												}}
											>
												{resolvedAddress}
											</div>
										</div>
									)}
								</div>

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
								This GitHub handle hasn't set up their account yet
							</div>
						</div>
					)}
				</div>

			</div>
		</div>
	);
}


