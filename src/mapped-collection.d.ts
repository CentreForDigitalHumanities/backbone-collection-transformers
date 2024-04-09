import { Model, Collection, AddOptions as BAddOptions } from 'backbone';

import ProxyMixin from './collection-proxy';

type AnyFunction = (...args: any[]) => any;
type IterateeParam = string | AnyFunction;

interface Traceable {
    _ucid?: Record<string, string>;
}

interface AddOptions extends BAddOptions {
    convert?: boolean;
}

interface MappedCollection<
    T extends Model = Model,
    S extends Model = Model,
    U extends Collection<S> = Collection<S>,
    B extends Collection<T & Traceable>
> extends ProxyMixin<S, U> {
    // Redeclaring the type of the add method in order to accomodate AddOptions.
    add(model: {} | T, options?: AddOptions): T & Traceable;
    add(models: Array<{} | T>, options?: AddOptions): (T & Traceable)[];
}
declare class MappedCollection<
    T extends Model = Model,
    S extends Model = Model,
    U extends Collection<S> = Collection<S>,
    B extends Collection<T & Traceable>
> extends B {
    convert: AnyFunction;
    _cidMap: Record<string, string>;
    cid: string;
    cidPrefix: string;

    constructor(underlying: U, conversion: IterateeParam, options?: any);
    preinitialize(models: S[], {underlying, convert}): void;
    initialize(models: S[], {underlying, convert}): void;
    mappedCid(model: S): string;
    getMapped(model: S): T & Traceable;
    preprocess(model: S): any;
    set(model: {} | T, options): T & Traceable;
    set(models: Array<{} | T>, options): (T & Traceable)[];
    proxyAdd(model: S, collection: U, options: any): void;
    proxyRemove(model: S, collection: U, options: any): void;
    proxyReset(collection: U, options: any): void;
    proxySort(collection: U, options: any): void;
    proxyChange(model: S, options: any): void;
}

export default function deriveMapped<
    T extends Model = Model,
    S extends Model = Model,
    U extends Collection<S> = Collection<S>,
    B extends Collection<T & Traceable>
>(base: typeof B = B): typeof MappedCollection<T, S, U, B>;
