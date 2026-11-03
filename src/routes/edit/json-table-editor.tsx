import { FileTextIcon } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { EmptyState } from "#/components/gitbook/page";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { ScrollArea } from "#/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import type { MediaItem } from "./helpers";

export type JsonRow = Record<string, unknown>;

interface JsonTableEditorProps {
	media: MediaItem[];
	rowId: string | null;
	rows: JsonRow[];
	setRowId: (id: string | null) => void;
	setRows: React.Dispatch<React.SetStateAction<JsonRow[]>>;
}

export function JsonTableEditor({ media, rowId, rows, setRowId, setRows }: JsonTableEditorProps) {
	const sel: JsonRow | undefined =
		rows.find((r) => String(r.id ?? "") !== "" && String(r.id) === String(rowId)) ??
		rows.find((_r, index) => `__row-${index}` === String(rowId)) ??
		rows[0];
	const selIndex = sel ? rows.indexOf(sel) : -1;
	const [rowDeleteOpen, setRowDeleteOpen] = useState(false);
	const setRow = (patch: Partial<JsonRow>): void => {
		// Match by reference (fall back to index): matching on `id` alone would
		// patch every id-less row at once when `id` is undefined.
		setRows((prev) => prev.map((r) => (r === sel ? { ...r, ...patch } : r)));
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle>Table editor ({rows.length} rows)</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Select
						onValueChange={(v) => setRowId(v)}
						value={String(sel?.id ?? (selIndex >= 0 ? `__row-${selIndex}` : ""))}
					>
						<SelectTrigger className="w-52">
							<SelectValue placeholder="Select row" />
						</SelectTrigger>
						<SelectContent>
							{rows.map((r) => {
								// Fallback keys/values: rows without `id` would all
								// stringify to "undefined" and collide, so fall back to
								// the row position (via indexOf, not the map index).
								const fallback = `__row-${rows.indexOf(r)}`;
								const value = String(r.id ?? fallback);
								return (
									<SelectItem key={value} value={value}>
										{String(r.id ?? `row ${rows.indexOf(r) + 1}`)}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
					<Button
						onClick={() => {
							const id = `new-${Date.now()}`;
							setRows((p) => [...p, { id }]);
							setRowId(id);
						}}
						size="sm"
						variant="outline"
					>
						Add row
					</Button>
					<Button
						disabled={!sel}
						onClick={() => {
							if (sel) setRowDeleteOpen(true);
						}}
						size="sm"
						variant="destructive"
					>
						Delete row
					</Button>
				</div>
				{sel ? (
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="json-id">id</FieldLabel>
							<Input
								id="json-id"
								onChange={(e) => setRow({ id: e.target.value })}
								value={String(sel.id ?? "")}
							/>
						</Field>
						{(sel.logo !== undefined || sel.img !== undefined) && (
							<Field>
								<FieldLabel htmlFor="json-logo">
									{sel.logo === undefined ? "img" : "logo"}
								</FieldLabel>
								<Input
									id="json-logo"
									onChange={(e) =>
										setRow(
											sel.logo === undefined ? { img: e.target.value } : { logo: e.target.value },
										)
									}
									value={String(sel.logo ?? sel.img ?? "")}
								/>
								<Select
									onValueChange={(v) =>
										v && setRow(sel.logo === undefined ? { img: v } : { logo: v })
									}
									value=""
								>
									<SelectTrigger>
										<SelectValue placeholder="— pick media —" />
									</SelectTrigger>
									<SelectContent>
										{media.slice(0, 200).map((m) => (
											<SelectItem key={m.path} value={m.path}>
												{m.path}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
						{sel.role !== undefined && (
							<Field>
								<FieldLabel htmlFor="json-role">role</FieldLabel>
								<Input
									id="json-role"
									onChange={(e) => setRow({ role: e.target.value })}
									value={String(sel.role ?? "")}
								/>
							</Field>
						)}
						{sel.text !== undefined && (
							<Field>
								<FieldLabel htmlFor="json-text">text</FieldLabel>
								<Textarea
									id="json-text"
									onChange={(e) => setRow({ text: e.target.value })}
									value={String(sel.text ?? "")}
								/>
							</Field>
						)}
						{sel.className !== undefined && (
							<Field>
								<FieldLabel htmlFor="json-class">className</FieldLabel>
								<Input
									id="json-class"
									onChange={(e) => setRow({ className: e.target.value })}
									value={String(sel.className ?? "")}
								/>
							</Field>
						)}
						<Field>
							<FieldLabel htmlFor="json-proof">proof (JSON)</FieldLabel>
							<Textarea
								className="font-mono"
								id="json-proof"
								onChange={(e) => {
									try {
										const v = JSON.parse(e.target.value);
										if (sel.proof !== undefined || e.target.value.includes("proof"))
											setRow({ proof: v });
										else setRow({ project: v });
									} catch {
										/* keep typing */
									}
								}}
								value={JSON.stringify(sel.proof ?? sel.project ?? "", null, 2)}
							/>
						</Field>
						<ScrollArea className="max-h-45dvh">
							<pre className="code-surface p-3 font-mono text-xs">
								{JSON.stringify(sel, null, 2).slice(0, 2000)}
							</pre>
						</ScrollArea>
					</FieldGroup>
				) : (
					<EmptyState
						compact
						description="Add a row to get started."
						icon={FileTextIcon}
						title="No rows"
					/>
				)}
			</CardContent>
			<AlertDialog onOpenChange={setRowDeleteOpen} open={rowDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete row {String(sel?.id ?? "")}?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the row from the table. Save to persist.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<Button
							onClick={() => {
								setRowDeleteOpen(false);
								if (sel) setRows((p) => p.filter((r) => r !== sel));
							}}
							variant="destructive"
						>
							Delete row
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
