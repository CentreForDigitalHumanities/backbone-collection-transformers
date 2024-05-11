import { extend, defaults, omit, iteratee, isFunction } from 'underscore';
import { Collection } from 'backbone';
import { mixin } from '@uu-cdh/backbone-util';

import { deriveConstructor } from './inheritance.js';
import CollectionProxy from './collection-proxy.js';

// The part of the constructor that runs before `super`.
function ctorStart(underlying, criterion, options) {
    var comparator = underlying.comparator;
    options = defaults({}, options, {
        underlying,
        criterion,
        model: underlying.model,
    }, comparator && { comparator } || {});
    var initialModels = underlying.filter(criterion);
    // The arguments that will be passed to `super`.
    return [initialModels, options];
}

// The part of the constructor that runs after `super`.
function ctorEnd(ctorArgs) {
    var underlying = ctorArgs[0];
    this.listenTo(underlying, {
        add: this.proxyAdd,
        remove: this.proxyRemove,
        reset: this.proxyReset,
        sort: this.proxySort,
        change: this.proxyChange,
    });
}

// The instance methods and properties of a FilteredCollection.
/** @lends deriveConstructor~FilteredCollection.prototype */
var FilteredCollectionMixin = {
    /**
     * Criterion to filter by. Can be anything that is supported as an iteratee
     * by `Backbone.Collection`, such as a function, an attribute matching
     * object, or a property name or path.
     * @member {*} criterion
     */

    /**
     * Boolean predicate that determines whether a model should be in the
     * filtered collection. This is a standardized version of
     * {@link deriveConstructor~FilteredCollection#criterion}.
     * @method matches
     * @param {Backbone.Model} model - Model to filter.
     * @returns {boolean} true if the the model should be included in the
     * filtered collection, false otherwise.
     */

    /**
     * If you subclass a filtered collection, make sure to call super in the
     * preinitialize method.
     */
    preinitialize(models, {underlying, criterion}) {
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
     * This method is automatically invoked when a model is added to the
     * underlying collection.
     */
    proxyAdd(model, collection, options) {
        if (this.matches(model)) this.add(model, omit(options, 'at'));
    },

    /**
     * This method is automatically invoked when a model is removed from the
     * underlying collection.
     */
    proxyRemove(model, collection, options) {
        this.remove(model, options);
    },

    /**
     * This method is automatically invoked when the underlying collection is
     * reset.
     */
    proxyReset(collection, options) {
        this.reset(this._underlying.filter(this.criterion), options);
    },

    /**
     * This method is automatically invoked when the underlying collection is
     * sorted.
     */
    proxySort(collection, options) {
        if (this.comparator) this.sort(options);
    },

    /**
     * This method is automatically invoked when a model in the underlying
     * collection changes.
     */
    proxyChange(model, options) {
        if (this.matches(model)) {
            this.add(model, options);
        } else {
            this.remove(model, options);
        }
    },
};

/**
 * Derived a filtered collection class from a given base class.
 * @param {typeof Backbone.Collection} [Base=Backbone.Collection] Base collection class to derive from.
 * @returns {typeof deriveFiltered~FilteredCollection} filtered collection
 * class. Instances of this class will act as a filtered proxy to an instance of
 * the Base class.
 */
export default function deriveFiltered(Base) {
    Base = Base || Collection;
    /**
     * Synchronized filtered read-only proxy to a Backbone.Collection.
     *
     * Use this to keep a filtered subset of some other, pre-existing collection
     * (the underlying collection). The filtered proxy stays in sync with the
     * underlying collection and will emit the same events when the filtered
     * subset is affected. Do not fetch or modify the proxy directly; such
     * operations should be performed on the underlying collection instead.
     *
     * @class
     * @mixes CollectionProxy
     * @param {Backbone.Collection} underlying - Collection to filter.
     * @param {*} criterion - Criterion to filter by. Can be anything that is
     * supported as an iteratee by `Backbone.Collection`, such as a function, an
     * attribute matching object, or a property name or path.
     * @param {Object} options - The usual options that one may pass to the
     * [Backbone.Collection constructor]{@link
     * https://backbonejs.org/#Collection-constructor}.
     * @param {string|Function} options.comparator - Specifies how to sort the
     * filtered collection.
     * @example

        var myFilteredProxy = new FilteredCollection(theRawCollection, model => {
            return model.has('@id');
        });
        myFilteredProxy.forEach(...);
        myFilteredProxy.on('add', ...);

     */
    var FilteredCollection = deriveConstructor(Base, ctorStart, ctorEnd);
    mixin(FilteredCollection.prototype, FilteredCollectionMixin, CollectionProxy);
    return FilteredCollection;
}
