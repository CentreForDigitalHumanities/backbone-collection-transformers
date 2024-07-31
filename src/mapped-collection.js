import _, {
    defaults,
    extend,
    invert,
    iteratee,
    keys,
    map,
    noop,
    omit,
    property,
    uniqueId,
} from 'underscore';
import { Model, Collection } from 'backbone';
import { mixin } from '@uu-cdh/backbone-util';

import { deriveConstructor } from './inheritance.js';
import CollectionProxy from './collection-proxy.js';

// Underscore/Lodash compatibility.
var mapObject = _.mapObject || _.mapValues;
var compose = _.compose || _.flowRight;

// Helper for the next function.
var getAttributes = property('attributes');

// Convert the original mapper from the client code, which might be an iteratee
// shorthand, to something that is certainly a function. Shorthands implicitly
// apply to the attributes of a model rather than to the model as a whole.
function wrapModelIteratee(conversion) {
    if (isFunction(conversion)) return conversion;
    return compose(iteratee(conversion), getAttributes);
}

// The part of the constructor that runs before super().
function ctorStart(underlying, conversion, options) {
    var convert = wrapModelIteratee(conversion);
    return [underlying.models, options];
}

// The part of the constructor that runs after super().
function ctorEnd(ctorArgs) {
    var underlying = ctorArgs[0];
    this.listenTo(underlying, {
        add: this.proxyAdd,
        remove: this.proxyRemove,
        reset: this.proxyReset,
        change: this.proxyChange,
        sort: this.proxySort,
    });
}

// The instance methods and properties of a MappedCollection.
/** @lends deriveMapped~MappedCollection.prototype */
var MappedCollectionMixin = {
    /**
     * Conversion function that maps a model in the underlying collection to a
     * corresponding model or attributes hash in the mapped collection.
     * @method convert
     * @param {Backbone.Model} model - Model to convert.
     * @returns {object|Backbone.Model} attributes hash or model as it should be
     * stored in the mapped collection.
     */

    /**
     * Unique identifier for the collection. This is kept in order to be able to
     * trace relations from mapped models to potentially multiple containing
     * MappedCollection instances.
     * @member {string} cid
     */

    /**
     * The `cidPrefix` is passed to `_.uniqueId` in order to determine the
     * `cid`. This is similar to how it is done with `Backbone.Model#cidPrefix`.
     */
    cidPrefix: 'mc',

    /**
     * If you subclass a mapped collection, make sure to call super in the
     * preinitialize method.
     */
    preinitialize(models, {underlying, convert}) {
        extend(this, {
            _underlying: underlying,
            convert,
            _cidMap: {},
            cid: uniqueId(this.cidPrefix),
        });
    },

    /**
     * Given a model from the underlying collection, obtain the `cid` of the
     * corresponding mapped model.
     */
    mappedCid(model) {
        return this._cidMap[model.cid];
    },

    /**
     * Given a model from the underlying collection, obtain the corresponding
     * mapped model.
     */
    getMapped(model) {
        return this.get(this.mappedCid(model));
    },

    // We add a private `_ucid` property to models in the mapped collection. Its
    // keys are the `cid`s of any mapped collections that the model is a member
    // of, and its values are the `cid`s of the corresponding models in the
    // corresponding underlying collections. This is many-to-many, because
    // mapper functions might return pre-existing models. This reverse lookup
    // mechanism is somewhat similar to how you might polyfill `WeakMap`.

    /**
     * Given a model from the underlying collection, perform `convert` and
     * prepare the result for insertion in the collection. The result might
     * still be either an attributes hash or a model.
     */
    preprocess(model) {
        var mapped = this.convert(model);
        // Add our `_ucid` annotation. We ensure that the `_ucid` is set only on
        // the model and not on the attributes in `_prepareModel`.
        var _ucid = mapped._ucid || {};
        extend(_ucid, {[this.cid]: model.cid});
        return extend(mapped, {_ucid});
    },

    /**
     * We extend the `set` method so that we can insert models from the
     * underlying collection and have them converted on the fly. Skipping
     * automatic conversion is still possible by passing `convert: false`.
     */
    set(models, options) {
        var singular = !isArray(models);
        if (singular) models = [models];
        if (options.convert !== false) {
            models = map(models, this.preprocess.bind(this));
        }
        var result = super.set(models, options);
        return singular ? result[0] : result;
    },

    /**
     * This method is automatically invoked when a model is added to the
     * underlying collection.
     */
    proxyAdd(model, collection, options) {
        if (this.comparator) {
            // Mapped collection is maintaining its own order, so ignore any
            // specific placement in the underlying collection.
            options = omit(options, 'at');
        } else {
            // Mapped collection is mirroring the order of the underlying
            // collection, so prevent it from sorting.
        }
        this.add(model, options);
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
        this.reset(collection.models, options);
    },

    /**
     * This method is automatically invoked when the underlying collection is
     * sorted.
     */
    proxySort(collection, options) {
        if (this.comparator) return;
        // Align the order of the mapped models with that of the models in the
        // underlying collection. We do not call `this.sort()` because that
        // requires a `.comparator`. Instead, we mimic its implementation by
        // hardcoding a `sortBy` and then triggering the same event.
        var order = invert(map(collection.models, this.mappedCid.bind(this)));
        this.models = this.sortBy(model => order[model.cid]);
        this.trigger('sort', this, options);
    },

    /**
     * This method is automatically invoked when a model in the underlying
     * collection changes.
     */
    proxyChange(model, options) {
        var oldModel = this.getMapped(model);
        var newConversion = this.preprocess(model);

        // If the conversion produces the exact same complete model before and
        // after the change, nothing needs to be done.
        if (newConversion === oldModel) return;

        if (newConversion instanceof Model) {
            // `oldModel` or `newConversion` might be a pre-existing model that
            // also appears in other collections. In that case, it is
            // undesirable to assign properties from `newConversion` to
            // `oldModel`. Instead, we substitute `newConversion` as a whole for
            // `oldModel` at the same index within `this.models`. To achieve
            // this and to avoid a costly additional `indexOf`, we exploit the
            // fact that the `'remove'` event payload includes the index of the
            // removed model already.
            var position;
            this.once('remove', (m, c, {index}) => position = index)
            .remove(model);
            // We already set the `_ucid` administration in `this.preprocess`
            // above, so we can pass the `newConversion` straight to `super.set`
            // without any further conversion.
            this.add(newConversion, {at: position, convert: false});
            return;
        }

        // In the remaining cases, `newConversion` is an attributes hash, in
        // which case we want to update `oldModel` in place. We don't want to
        // pollute the attributes with our internal `_ucid` administration, so
        // we delete that first.
        delete newConversion._ucid;
        var newAttributes = newConversion;
        // While we will be reusing `oldModel`, we also create a temporary model
        // from the `newAttributes` in order to assist the difference
        // computations below. This will no longer be necessary when
        // https://github.com/jashkenas/backbone/issues/3253 is implemented.
        var newModel = new this.model(newAttributes);
        var oldAttributes = oldModel.attributes;
        // Attributes in `oldModel` that either changed value or are no longer
        // present in `newAttributes`.
        var removedAttributes = newModel.changedAttributes(oldAttributes) || {};
        // Attributes in `newModel` that either changed value or were not yet
        // present in `oldAttributes`.
        var addedAttributes = oldModel.changedAttributes(newAttributes) || {};
        // We take the difference between the former and the latter to obtain
        // only the attributes that should be removed entirely. We do this
        // because we don't want to accumulate obsolete attributes over time;
        // the new attributes should replace the old attributes entirely. We
        // *could* just do `oldModel.clear().set(newAttributes)` instead, but
        // this would temporarily leave the model blank and also trigger two
        // `'change:'` events for each attribute that is present both before and
        // after the update, even if some attributes don't change.
        var deleteAttributes = omit(removedAttributes, keys(addedAttributes));
        oldModel.set(mapObject(deleteAttributes, noop), {unset: true})
        .set(newAttributes);
    },

    _prepareModel(attrs, options) {
        // `attrs` might be either an actual attributes hash or an already
        // constructed model. The `_ucid` property has already been added in
        // `this.preprocess`. We want it to be present specifically on the model
        // and not on the attributes hash, so we remove it before passing it to
        // `super._prepareModel` and then add it back afterwards, when we know
        // for sure that we are dealing with a model.
        var {_ucid} = attrs;
        delete attrs._ucid;
        var result = super._prepareModel(attrs, options);
        return extend(result, {_ucid});
    },

    _removeModels(models, options) {
        // The `remove` method always receives members of the underlying
        // collection, so we look up the corresponding mapped models before
        // performing the actual removal.
        var existing = map(models, this.getMapped.bind(this));
        return super._removeModels(existing, options);
    },

    _addReference(model, options) {
        this._cidMap[model._ucid[this.cid]] = model.cid;
        return super._addReference(model, options);
    },

    _removeReference(model, options) {
        delete this._cidMap[model._ucid[this.cid]];
        delete model._ucid[this.cid];
        if (isEmpty(model._ucid)) delete model._ucid;
        return super._removeReference(model, options);
    },
});

/**
 * Derive a mapped collection class from a given base class.
 * @param {typeof Backbone.Collection} [Base=Backbone.Collection] Base
 * collection class to derive from.
 * @returns {typeof deriveMapped~MappedCollection} Mapped collection class.
 * Instances of this class will contain a corresponding mapped model for each
 * model in an instance of the Base class.
 */
export default function deriveMapped(Base) {
    Base = Base || Collection;
    /**
     * Synchronized mapped read-only proxy to a `Backbone.Collection`.
     *
     * Use this to keep a mapped version of some other, pre-existing
     * collection (the underlying collection). The mapped proxy stays
     * in sync with the underlying collection and will emit similar
     * events when the mapped version is affected. Do not fetch or
     * modify the proxy directly; such operations should be performed on
     * the underlying collection instead.
     *
     * By default, the models of the mapped collection will stay in the
     * same relative order as their respective corresponding models in
     * the underlying collection. You can override the `.comparator` in
     * order to specifiy different sorting behavior.
     *
     * **Note**: the mapping function must produce either attribute
     * hashes or full models. The mapping function should be injective,
     * i.e., at most one model in the underlying collection should be
     * mapped to any given id. There are two main ways in which you could
     * specify how ids for mapped models are determined: by including the
     * `idAttribute` in the result of the conversion function, or by
     * overriding `.modelId()` in a subclass of `MappedCollection`.
     *
     * @class
     * @mixes CollectionProxy
     * @param {Collection} underlying - The input collection.
     * @param {String|Function} conversion - A function that takes a single model
     * from `underlying` as input, or a string naming an attribute of the
     * underlying model type that should be read in order to obtain the mapped
     * model. In either case, the result of the conversion should be either an
     * attributes hash or a model.
     * @param {Object} [options] - The same options that may be passed
     * to [Backbone.Collection]]{@link
     * https://backbonejs.org/#Collection-constructor}.
     * @param {string|Function} options.comparator - Specifies how to sort the
     * mapped collection. If omitted, the order of the underlying collection is
     * mirrorred.

     * @example

       var idOnlyProxy = new MappedCollection(theRawCollection, model => {
           return model.pick('id');
       });
       idOnlyProxy.forEach(...);
       idOnlyProxy.on('add', ...);

    */
    var MappedCollection = deriveConstructor(Base, ctorStart, ctorEnd);
    mixin(MappedCollection.prototype, MappedCollectionMixin, CollectionProxy);
    return MappedCollection;
}
