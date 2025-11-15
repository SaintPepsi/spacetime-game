import { SpacetimeDB } from '$lib/SpacetimeDB.svelte';
import type { DbConnectionImpl, TableCache } from 'spacetimedb';
import { untrack } from 'svelte';

// Interface that can be augmented via module declaration (like TanStack Router)
export interface Register {
	// connection: YourCustomDbConnection
}

// Use the registered connection type, falling back to DbConnectionImpl if not registered
type Connection = Register extends { connection: infer T } ? T : DbConnectionImpl;

export interface UseQueryCallbacks<RowType> {
	onInsert?: (row: RowType) => void;
	onDelete?: (row: RowType) => void;
	onUpdate?: (oldRow: RowType, newRow: RowType) => void;
}

export type Value = string | number | boolean;

export type Expr<Column extends string> =
	| { type: 'eq'; key: Column; value: Value }
	| { type: 'and'; children: Expr<Column>[] }
	| { type: 'or'; children: Expr<Column>[] };

// Query builder helpers (unchanged from React version)
export const eq = <Column extends string>(key: Column, value: Value): Expr<Column> => ({
	type: 'eq',
	key,
	value
});

export const and = <Column extends string>(...children: Expr<Column>[]): Expr<Column> => {
	const flat: Expr<Column>[] = [];
	for (const c of children) {
		if (!c) continue;
		if (c.type === 'and') flat.push(...c.children);
		else flat.push(c);
	}
	const pruned = flat.filter(Boolean);
	if (pruned.length === 0) return { type: 'and', children: [] };
	if (pruned.length === 1) return pruned[0];
	return { type: 'and', children: pruned };
};

export const or = <Column extends string>(...children: Expr<Column>[]): Expr<Column> => {
	const flat: Expr<Column>[] = [];
	for (const c of children) {
		if (!c) continue;
		if (c.type === 'or') flat.push(...c.children);
		else flat.push(c);
	}
	const pruned = flat.filter(Boolean);
	if (pruned.length === 0) return { type: 'or', children: [] };
	if (pruned.length === 1) return pruned[0];
	return { type: 'or', children: pruned };
};

// Evaluation and formatting functions (unchanged)
function evaluate<Column extends string>(
	expr: Expr<Column>,
	row: Record<Column, unknown>
): boolean {
	switch (expr.type) {
		case 'eq': {
			const v = row[expr.key];
			if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
				return v === expr.value;
			}
			return false;
		}
		case 'and':
			return expr.children.length === 0 || expr.children.every((c) => evaluate(c, row));
		case 'or':
			return expr.children.length !== 0 && expr.children.some((c) => evaluate(c, row));
	}
}

function formatValue(v: Value): string {
	switch (typeof v) {
		case 'string':
			return `'${v.replace(/'/g, "''")}'`;
		case 'number':
			return Number.isFinite(v) ? String(v) : `'${String(v)}'`;
		case 'boolean':
			return v ? 'TRUE' : 'FALSE';
	}
}

function escapeIdent(id: string): string {
	if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) return id;
	return `"${id.replace(/"/g, '""')}"`;
}

function parenthesize(s: string): string {
	if (!s.includes(' AND ') && !s.includes(' OR ')) return s;
	return `(${s})`;
}

export function toString<Column extends string>(expr: Expr<Column>): string {
	switch (expr.type) {
		case 'eq':
			return `${escapeIdent(expr.key)} = ${formatValue(expr.value)}`;
		case 'and':
			return parenthesize(expr.children.map(toString).join(' AND '));
		case 'or':
			return parenthesize(expr.children.map(toString).join(' OR '));
	}
}

export function where<Column extends string>(expr: Expr<Column>): Expr<Column> {
	return expr;
}

type MembershipChange = 'enter' | 'leave' | 'stayIn' | 'stayOut';

function classifyMembership<Col extends string, R extends Record<string, unknown>>(
	where: Expr<Col> | undefined,
	oldRow: R,
	newRow: R
): MembershipChange {
	if (!where) {
		return 'stayIn';
	}

	const oldIn = evaluate(where, oldRow);
	const newIn = evaluate(where, newRow);

	if (oldIn && !newIn) return 'leave';
	if (!oldIn && newIn) return 'enter';
	if (oldIn && newIn) return 'stayIn';
	return 'stayOut';
}

export type ColumnsFromRow<R> = {
	[K in keyof R]-?: R[K] extends Value | undefined ? K : never;
}[keyof R] &
	string;

export type RowTypes<TableName extends keyof Connection['db']> = Parameters<
	Connection['db'][TableName]['tableCache']['update']
>[2];

/**
 * Svelte 5 rune class for subscribing to SpacetimeDB tables with reactive updates.
 *
 * Unlike React hooks which are functions called on every render, this is a class
 * that maintains its own reactive state using Svelte 5's signal system.
 *
 * @example
 * ```svelte
 * <script>
 *   const userTable = new TableQuery('users', where(eq('isActive', true)), {
 *     onInsert: (row) => console.log('Inserted:', row),
 *     onDelete: (row) => console.log('Deleted:', row),
 *     onUpdate: (oldRow, newRow) => console.log('Updated:', oldRow, newRow),
 *   });
 * </script>
 *
 * {#if userTable.state === 'loading'}
 *   <p>Loading...</p>
 * {:else}
 *   {#each userTable.rows as user}
 *     <div>{user.name}</div>
 *   {/each}
 * {/if}
 * ```
 */
export class TableQuery<
	TableName extends keyof Connection['db'],
	RowType extends RowTypes<TableName>
> {
	// Reactive state using $state rune
	#rows = $state<readonly RowType[]>([]);
	#subscribeApplied = $state<boolean>(false);

	// Non-reactive internal state
	#client: Connection;
	#tableName: TableName;
	#whereClause: Expr<ColumnsFromRow<RowType>> | undefined;
	#callbacks: UseQueryCallbacks<RowType> | undefined;
	#query: string;
	#latestTransactionEvent: any = null;
	#unsubscribe: (() => void) | null = null;
	#tableUnSubscribers: Array<() => void> = [];

	constructor(
		tableName: TableName,
		whereClause?: Expr<ColumnsFromRow<RowType>>,
		callbacks?: UseQueryCallbacks<RowType>
	) {
		this.#client = SpacetimeDB.getContext<Connection>();
		this.#tableName = tableName;
		this.#whereClause = whereClause;
		this.#callbacks = callbacks;

		this.#query =
			`SELECT * FROM ${tableName as string}` +
			(whereClause ? ` WHERE ${toString(whereClause)}` : '');

		// Initialize subscription in constructor
		this.#setupSubscription();
	}

	/**
	 * Reactive getter for rows - automatically tracks dependencies
	 * When accessed in a $derived or template, Svelte knows to re-render
	 */
	get rows(): readonly RowType[] {
		return this.#rows;
	}

	/**
	 * Reactive getter for subscription state
	 */
	get state(): 'loading' | 'ready' {
		return this.#subscribeApplied ? 'ready' : 'loading';
	}

	/**
	 * Compute the current snapshot from the table cache
	 * This method is NOT reactive - it's called when we need to update state
	 */
	#computeSnapshot(): readonly RowType[] {
		const table = this.#client.db[
			this.#tableName as keyof Connection['db']
		] as unknown as TableCache<RowType>;

		if (this.#whereClause) {
			return table.iter().filter((row) => evaluate(this.#whereClause!, row));
		}
		return table.iter();
	}

	/**
	 * Update reactive state - this triggers Svelte's reactivity
	 */
	#updateSnapshot(): void {
		// Use untrack to prevent infinite loops if computeSnapshot accesses reactive state
		this.#rows = untrack(() => this.#computeSnapshot());
	}

	#setupSubscription(): void {
		console.log('this.#client.isActive', this.#client.isActive);
		if (!this.#client.isActive) {
			// If client becomes active later, you might want to use $effect to watch this
			return;
		}

		// Subscribe to the SpacetimeDB query
		const cancel = this.#client
			.subscriptionBuilder()
			.onApplied(() => {
				this.#subscribeApplied = true;
				this.#updateSnapshot();
			})
			.subscribe(this.#query);

		this.#unsubscribe = () => {
			cancel.unsubscribe();
		};

		// Set up table event listeners
		this.#setupTableListeners();
	}

	#setupTableListeners(): void {
		const table = this.#client.db[
			this.#tableName as keyof Connection['db']
		] as unknown as TableCache<RowType>;

		const onInsert = (ctx: any, row: RowType) => {
			if (this.#whereClause && !evaluate(this.#whereClause, row)) {
				return;
			}

			this.#callbacks?.onInsert?.(row);

			// Only update snapshot once per transaction event
			if (ctx.event !== this.#latestTransactionEvent || !this.#latestTransactionEvent) {
				this.#latestTransactionEvent = ctx.event;
				this.#updateSnapshot();
			}
		};

		const onDelete = (ctx: any, row: RowType) => {
			if (this.#whereClause && !evaluate(this.#whereClause, row)) {
				return;
			}

			this.#callbacks?.onDelete?.(row);

			if (ctx.event !== this.#latestTransactionEvent || !this.#latestTransactionEvent) {
				this.#latestTransactionEvent = ctx.event;
				this.#updateSnapshot();
			}
		};

		const onUpdate = (ctx: any, oldRow: RowType, newRow: RowType) => {
			const change = classifyMembership(this.#whereClause, oldRow, newRow);

			switch (change) {
				case 'leave':
					this.#callbacks?.onDelete?.(oldRow);
					break;
				case 'enter':
					this.#callbacks?.onInsert?.(newRow);
					break;
				case 'stayIn':
					this.#callbacks?.onUpdate?.(oldRow, newRow);
					break;
				case 'stayOut':
					return; // no-op
			}

			if (ctx.event !== this.#latestTransactionEvent || !this.#latestTransactionEvent) {
				this.#latestTransactionEvent = ctx.event;
				this.#updateSnapshot();
			}
		};

		table.onInsert(onInsert);
		table.onDelete(onDelete);
		table.onUpdate?.(onUpdate);

		// Store cleanup functions
		this.#tableUnSubscribers.push(
			() => table.removeOnInsert(onInsert),
			() => table.removeOnDelete(onDelete),
			() => table.removeOnUpdate?.(onUpdate)
		);
	}

	/**
	 * Manual cleanup method - call this when the component unmounts
	 * In Svelte 5, you'd typically use this with $effect cleanup
	 */
	destroy(): void {
		this.#unsubscribe?.();
		this.#tableUnSubscribers.forEach((unsubscribe) => unsubscribe());
		this.#tableUnSubscribers = [];
	}
}

/**
 * Alternative: A more "hook-like" function that returns reactive state
 * This uses $effect internally to handle lifecycle
 */
export function useTable<
	TableName extends keyof Connection['db'],
	RowType extends RowTypes<TableName>
>(
	tableName: TableName,
	whereClause?: Expr<ColumnsFromRow<RowType>>,
	callbacks?: UseQueryCallbacks<RowType>
) {
	const query = new TableQuery(tableName, whereClause, callbacks);

	// Automatic cleanup when component unmounts
	$effect(() => {
		return () => query.destroy();
	});

	return {
		get rows() {
			return query.rows;
		},
		get state() {
			return query.state;
		}
	};
}
