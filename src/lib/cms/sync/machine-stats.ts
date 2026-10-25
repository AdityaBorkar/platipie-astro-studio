// Machine stats reporter for the sync CLI (`--machine-stats=<seconds>`).
// Prints CPU, memory, and disk usage on an interval. Server/CLI-only.
import { execFileSync } from "node:child_process";
import { cpus, freemem, loadavg, totalmem } from "node:os";

export interface CpuSample {
	busy: number;
	total: number;
}

function sampleCpu(): CpuSample[] {
	return cpus().map((cpu) => {
		const t = cpu.times;
		return {
			busy: t.user + t.nice + t.sys + t.irq,
			total: t.user + t.nice + t.sys + t.irq + t.idle,
		};
	});
}

async function cpuUsagePercent(): Promise<number> {
	const before = sampleCpu();
	await new Promise((resolve) => {
		setTimeout(resolve, 500);
	});
	const after = sampleCpu();
	let busy = 0;
	let total = 0;
	for (let i = 0; i < before.length; i++) {
		busy += after[i].busy - before[i].busy;
		total += after[i].total - before[i].total;
	}
	return total > 0 ? (busy / total) * 100 : 0;
}

function diskUsage(mountPath: string): { freeGb: string; totalGb: string; usePct: string } {
	try {
		const out = execFileSync("df", ["-k", mountPath], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 3000,
		});
		const line = out.trim().split("\n").at(-1) ?? "";
		const parts = line.split(/\s+/u);
		// df -k columns: filesystem 1K-blocks used available use% mounted-on
		if (parts.length >= 6) {
			const totalKb = Number(parts[1]);
			const availKb = Number(parts[3]);
			const usePct = parts[4] ?? "?";
			if (Number.isFinite(totalKb) && Number.isFinite(availKb) && totalKb > 0) {
				return {
					freeGb: `${(availKb / 1024 / 1024).toFixed(1)}G`,
					totalGb: `${(totalKb / 1024 / 1024).toFixed(1)}G`,
					usePct,
				};
			}
		}
	} catch {
		// `df` unavailable — report unknown below.
	}
	return { freeGb: "?", totalGb: "?", usePct: "?" };
}

function formatGb(bytes: number): string {
	return `${(bytes / 1024 ** 3).toFixed(1)}G`;
}

/** Print one `[machine-stats]` line for `mountPath` (defaults to ASTRO_ROOT). */
export async function printMachineStats(mountPath: string): Promise<void> {
	const [cpu, total, free] = [await cpuUsagePercent(), totalmem(), freemem()];
	const used = total - free;
	const load = loadavg()
		.map((value) => value.toFixed(2))
		.join(" ");
	const disk = diskUsage(mountPath);
	const stamp = new Date().toISOString();
	console.log(
		`[machine-stats ${stamp}] cpu=${cpu.toFixed(1)}% load(${load}) ` +
			`mem=${formatGb(used)}/${formatGb(total)} (${((used / total) * 100).toFixed(1)}%) ` +
			`disk(${mountPath})=${disk.totalGb} total ${disk.freeGb} free ${disk.usePct} used`,
	);
}

/** Start the interval reporter. Returns a stop function. */
export function startMachineStats(intervalSeconds: number, mountPath: string): () => void {
	const everyMs = Math.max(1, intervalSeconds) * 1000;
	console.log(
		`[machine-stats] reporting every ${Math.max(1, intervalSeconds)}s (mount: ${mountPath})`,
	);
	const timer = setInterval(() => {
		void printMachineStats(mountPath);
	}, everyMs);
	void printMachineStats(mountPath);
	return () => clearInterval(timer);
}
