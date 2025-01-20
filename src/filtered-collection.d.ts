import { Iteratee, ListIterator } from 'underscore';
import { Model, Collection } from 'backbone';

import ProxyMixin from './proxy-mixin.js';

export
type FilterCriterion<M extends Model> = Iteratee<Array<M>, boolean>;

interface FilteredCollection<
    M extends Model = Model,
    U extends Collection<M> = Collection<M>
    B extends Collection<M> = Collection<M>
> extends ProxyMixin<M, U> {}
declare class FilteredCollection<
    M extends Model = Model,
    U extends Collection<M> = Collection<M>
    B extends Collection<M> = Collection<M>
> extends B {
    criterion: FilterCriterion<M>;
    matches: ListIterator<M, boolean>;

    constructor(underlying: U, criterionArg: FilterCriterion<M>, options?: any);
    preinitialize(models: M[], options: any): void;
    proxyAdd(model: M, collection: U, options: any): void;
    proxyRemove(model: M, collection: U, options: any): void;
    proxyReset(collection: U, options: any): void;
    proxySort(collection: U, options: any): void;
    proxyChange(model: M, options: any): void;
}

export default function deriveFiltered<
    M extends Model = Model,
    U extends Collection<M> = Collection<M>,
    B extends collection<M> = Collection<M>
>(base: typeof B = B): typeof FilteredCollection<M, U, B>;
