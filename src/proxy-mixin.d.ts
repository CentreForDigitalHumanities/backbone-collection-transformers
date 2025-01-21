import { Model, Collection }  from 'backbone';

export interface ProxyMixin<
    M extends Model = Model,
    C extends Collection<M> = Collection<M>
> {
    _underlying: C;

    // TypeScript cannot accurately type the return value, so we opt out of type
    // checking by returning `any` instead.
    readonly underlying: any;
}

declare const ProxyMixin: ProxyMixin;
export default ProxyMixin;
