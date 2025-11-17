type None = { type: 'None' };

type Some<T> = { type: 'Some'; value: T };

type OptionValue<T> = Some<T> | None;
type PotentialOption<T> = T | null | undefined;

const none: None = { type: 'None' };

type MapFn<T, U> = (value: T) => PotentialOption<U>;
type FlatMapFn<T, U> = (value: T) => OptionValue<U>;

export type Option<T> = OptionValue<T> & FactoryMethods<T>;

type FactoryMethods<T> = {
	map<U>(fn: MapFn<T, U>): Option<U>;
	flatMap<U>(fn: FlatMapFn<T, U>): Option<U>;
	isSome(): boolean;
	unwrap(): T | void;
};

function optionFactory<T>(input: OptionValue<T>): Option<T> {
	return Object.assign(input, {
		map: <U>(fn: MapFn<T, U>) => optionFactory(map(input, fn)),
		flatMap: <U>(fn: FlatMapFn<T, U>) => optionFactory(flatMap(input, fn)),
		isSome: () => isSome(input),
		unwrap: () => unwrap(input)
	});
}

function createOption<T>(input: PotentialOption<T>) {
	const wrapped = wrap(input);
	return optionFactory(wrapped);
}

function unwrap<T>(input: OptionValue<T>): T | void {
	if (isSome(input)) {
		return input.value;
	}
	return void 0;
}

function some<T>(value: T): Some<T> {
	return { type: 'Some', value };
}

function isSome<T>(input: OptionValue<T>): input is Some<T> {
	return input.type === 'Some';
}

function wrap<T>(input: PotentialOption<T>): OptionValue<T> {
	if (input === null || input === undefined) {
		return none;
	}
	return some(input);
}

function isNone<T>(input: OptionValue<T>): input is None {
	return input.type === 'None';
}

function map<T, U>(input: OptionValue<T>, fn: (value: T) => U | null | undefined): OptionValue<U> {
	if (isSome(input)) {
		const result = fn(input.value);
		return wrap(result);
	}
	return none;
}

function flatMap<T, U>(option: OptionValue<T>, fn: (value: T) => OptionValue<U>): OptionValue<U> {
	if (isSome(option)) {
		return fn(option.value);
	}
	return none;
}

// const value = sample(['apple', 'greatest text!', undefined, null]);
// const wrapped = option(value);

// function getStringLength(v: string): Option<string> {
// 	return option(v.length > 5 ? v : null);
// }

// const mapped = map(wrapped, getStringLength);
// const flatMapped = flatMap(wrapped, getStringLength);

export const option = createOption;
