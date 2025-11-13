import { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import {
	handleToEnsName,
	resolveEnsToPredictedAddress,
	truncateMiddle,
	getSepoliaBalance,
} from "../../utils/ens";

export default function Pay() {
	const [handle, setHandle] = useState("");
	const ensName = useMemo(() => handleToEnsName(handle), [handle]);
	const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null);
	const [isResolving, setIsResolving] = useState(false);
	const [balance, setBalance] = useState<bigint | null>(null);

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

	const canCopy = Boolean(ensName || resolvedAddress);

	const onCopy = async (val: string) => {
		try {
			await navigator.clipboard.writeText(val);
			// No toast lib yet; silent success.
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
					<h1 style={{ fontSize: "28px", margin: 0, fontWeight: 700 }}>Tip any X handle</h1>
					<p className="help-text" style={{ marginTop: "6px" }}>
						Enter an X handle to get its Sepolia receive address via ENS.
					</p>
				</header>

				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "12px",
						padding: "20px",
						display: "grid",
						gap: "14px",
					}}
				>
					<label htmlFor="handle" style={{ fontWeight: 500 }}>
						X handle
					</label>
					<input
						id="handle"
						type="text"
						placeholder="@vitalik"
						value={handle}
						onChange={(e) => setHandle(e.target.value)}
						style={{
							width: "100%",
							padding: "10px 12px",
							borderRadius: "8px",
							border: "1px solid var(--border)",
							background: "var(--background)",
							color: "var(--text)",
						}}
					/>

					{ensName && (
						<div
							style={{
								display: "grid",
								gap: "10px",
								marginTop: "6px",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "10px",
								}}
							>
								<div>
									<div className="help-text" style={{ marginBottom: 4 }}>
										ENS name
									</div>
									<div style={{ fontFamily: "ui-monospace, monospace" }}>{ensName}</div>
								</div>
								<button
									className="link-cta"
									onClick={() => onCopy(ensName)}
									disabled={!canCopy}
									title="Copy ENS name"
								>
									Copy
								</button>
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "10px",
								}}
							>
								<div>
									<div className="help-text" style={{ marginBottom: 4 }}>
										Resolved address
									</div>
									<div style={{ fontFamily: "ui-monospace, monospace" }}>
										{isResolving ? "Resolving..." : resolvedAddress ? resolvedAddress : "—"}
									</div>
								</div>
								<button
									className="link-cta"
									onClick={() => resolvedAddress && onCopy(resolvedAddress)}
									disabled={!resolvedAddress}
									title="Copy address"
								>
									Copy
								</button>
							</div>

							{resolvedAddress && (
								<div className="help-text" style={{ marginTop: 4 }}>
									Send ETH on Sepolia to {truncateMiddle(resolvedAddress)} or to the ENS name above.
								</div>
							)}

							{resolvedAddress != null && balance != null && (
								<div className="help-text" style={{ marginTop: 4 }}>
									Current balance: {Number(formatEther(balance)).toFixed(6)} ETH
								</div>
							)}
						</div>
					)}
				</div>

				<div
					className="help-text"
					style={{
						textAlign: "center",
						opacity: 0.8,
					}}
				>
					Other payment methods like Stripe, PayPal, and Diamo Pay are coming soon.
				</div>
			</div>
		</div>
	);
}


