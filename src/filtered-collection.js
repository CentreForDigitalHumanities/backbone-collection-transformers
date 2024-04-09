import {
    extend,
    defaults,
    omit,
    iteratee,
    isFunction,
} from 'underscore';
import { Model, Collection } from 'backbone';
import mixin from '@uu-cdh/backbone-util';

import ProxyMixin from './collection-proxy.js';

var FilteredCollectionMixin = {
    criterion: FilterCriterion<M>;
    matches: AnyFunction;

    constructor(underlying, criterion, options) {
        var comparator = underlying.comparator;
        options = defaults({}, options, {
            underlying,
            criterion,
            model: underlying.model,
        }, comparator && { comparator } || {});
        var initialModels = underlying.filter(criterion);
        var instance = Reflect.construct(Base, [initialModels, options], new.target || FilteredCollection);
        instance.listenTo(underlying, {
            add: instance.proxyAdd,
            remove: instance.proxyRemove,
            reset: instance.proxyReset,
            sort: instance.proxySort,
            change: instance.proxyChange,
        });
        return instance;
    },

    preinitialize(models[], {underlying, criterion}) {
        var matches;
        if (isFunction(criterion)) {
            matches = criterion;
        } else {
            var wrappedIterator = iteratee(criterion);
            matches = model => wrappedIterator(model.attributes);
        }
        extend(this, {_underlying: underlying, criterion, matches});
    },

    /**
     * Forwarding methods. You are not supposed to invoke these yourself.
     */

    proxyAdd(model, collection, options) {
        if (this.matches(model)) this.add(model, omit(options, 'at'));
    },

    proxyRemove(model, collection, options) {
        this.remove(model, options);
    },

    proxyReset(collection, options) {
        this.reset(this._underlying.filter(this.criterion), options);
    },

    proxySort(collection, options) {
        if (this.comparator) this.sort(options);
    },

    proxyChange(model, options) {
        // attributes changed, so we need to re-evaluate the filter criterion.
        if (this.matches(model)) {
            this.add(model, options);
        } else {
            this.remove(model, options);
        }
    },
};

/**
 * Synchronized filtered read-only proxy to a Backbone.Collection.
 *
 * Use this to keep a filtered subset of some other, pre-existing
 * collection (the underlying collection). The filtered proxy stays
 * in sync with the underlying collection and will emit the same
 * events when the filtered subset is affected. Do not fetch or
 * modify the proxy directly; such operations should be performed on
 * the underlying collection instead.
 *
 * Example of usage:

    var myFilteredProxy = new FilteredCollection(theRawCollection, model => {
        return model.has('@id');
    });
    myFilteredProxy.forEach(...);
    myFilteredProxy.on('add', ...);

 */
class FilteredCollection extends Collection
mixin(FilteredCollection.prototype, ProxyMixin);

export default FilteredCollection;
