export function findBlockEnd(src: string, from: number, open: string, close: string): number {
	let depth = 0;
	let escaped = false;
	let instr: string | null = null;
	for (let i = from; i < src.length; i++) {
		const ch = src[i];
		if (instr) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === instr) instr = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			instr = ch;
			continue;
		}
		if (ch === open) depth++;
		else if (ch === close) {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

export function balancedSlice(
	text: string,
	openAt: number,
	open: string,
	close: string,
): string | null {
	const end = findBlockEnd(text, openAt, open, close);
	return end === -1 ? null : text.slice(openAt + 1, end);
}

export function findStatementEnd(src: string, from: number, end?: number): number {
	const stop = end ?? src.length;
	let braces = 0;
	let brackets = 0;
	let escaped = false;
	let inStr: string | null = null;
	let parens = 0;
	for (let i = from; i < stop; i++) {
		const ch = src[i];
		if (inStr) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === inStr) inStr = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			inStr = ch;
			continue;
		}
		if (ch === "{") braces++;
		else if (ch === "}") braces--;
		else if (ch === "[") brackets++;
		else if (ch === "]") brackets--;
		else if (ch === "(") parens++;
		else if (ch === ")") parens--;
		else if (ch === ";" && braces === 0 && brackets === 0 && parens === 0) return i;
	}
	return -1;
}

export function parseStringLiteral(raw: string): string | null {
	const trimmed = raw.trim();
	const quote = trimmed[0];
	if (quote !== '"' && quote !== "'" && quote !== "`") return null;
	if (trimmed.length < 2 || trimmed.at(-1) !== quote) return null;
	const inner = trimmed.slice(1, -1);
	if (quote === "`" && inner.includes("${")) return null;
	let out = "";
	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];
		if (ch !== "\\") {
			out += ch;
			continue;
		}
		const next = inner[++i];
		if (next === undefined) return null;
		if (next === "n") out += "\n";
		else if (next === "t") out += "\t";
		else if (next === "r") out += "\r";
		else if (next === "u") {
			const hex = inner.slice(i + 1, i + 5);
			if (!/^[0-9a-f]{4}$/iu.test(hex)) return null;
			out += String.fromCodePoint(Number.parseInt(hex, 16));
			i += 4;
		} else out += next;
	}
	return out;
}

export function stripTypeSuffix(raw: string): string {
	return raw
		.trim()
		.replace(/\s+as\s+const\s*$/u, "")
		.replace(/\s+as\s+never\[\]\s*$/u, "")
		.replace(/\s+satisfies\s+.*$/su, "");
}

export function stripComments(body: string): string {
	return body.replaceAll(/\/\*[\s\S]*?\*\//gu, "").replaceAll(/\/\/[^\n]*/gu, "");
}

export function arrayBody(raw: string): string | null {
	const trimmed = stripTypeSuffix(raw);
	if (trimmed[0] !== "[" || trimmed.at(-1) !== "]") return null;
	return trimmed.slice(1, -1);
}

export function topLevelKeys(body: string): string[] {
	const keys: string[] = [];
	let depth = 0;
	let escaped = false;
	let instr: string | null = null;
	let segment = "";
	const flush = () => {
		const match = /^\s*([A-Za-z_$][\w$]*)\s*:/u.exec(segment);
		if (match?.[1] && !keys.includes(match[1])) keys.push(match[1]);
		segment = "";
	};
	for (const ch of body) {
		if (instr) {
			segment += ch;
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === instr) instr = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			instr = ch;
			segment += ch;
			continue;
		}
		if (ch === "{") depth++;
		if (ch === "}") depth--;
		if (ch === "," && depth === 0) flush();
		else segment += ch;
	}
	flush();
	return keys;
}

export function topLevelListItems(body: string): string[] {
	const items: string[] = [];
	let current = "";
	let depth = 0;
	let escaped = false;
	let instr: string | null = null;
	const flush = () => {
		const trimmed = current.trim().replace(/,$/u, "");
		if (trimmed) items.push(trimmed);
		current = "";
	};
	for (const ch of body) {
		if (instr) {
			current += ch;
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === instr) instr = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			instr = ch;
			current += ch;
			continue;
		}
		if (ch === "(" || ch === "[" || ch === "{") depth++;
		if (ch === ")" || ch === "]" || ch === "}") depth--;
		if (ch === "," && depth === 0) flush();
		else current += ch;
	}
	flush();
	return items;
}
