# `@uu-cdh/backbone-collection-transformers/src/mapped-collection.js`

[view source](https://github.com/CentreForDigitalHumanities/backbone-collection-transformers/tree/main/src/mapped-collection.js)
[package README](../README.md)

A mapped collection lets you specify an underlying collection and a conversion relation and obtain a new collection where each model maps to a corresponding model in the underlying collection via the conversion relation. As models in the underlying collection are added, changed and removed, the mapped collection is automatically updated along, emitting its own events as well. A mapped collection is best used as a read-only proxy to its underlying collection.

```js
import { deriveMapped } from '@uu-cdh/backbone-collection-transformers';

// prepare a mapped collection class so we can instantiate it later
var MappedCollection = deriveMapped();

// the underlying collection (see README)
var chineseActors = ...

// the conversion relation
function joinName(actorModel) {
    var {familyName, givenName, ...otherAttributes} = actorModel.attributes;
    var fullName = `${familyName} ${givenName}`;
    return {fullName, ...otherAttributes};
}

// the mapped collection
var joinedNameActors = new MappedCollection(chineseActors, joinName);

// automatic addition
chineseActors.add({id: 1, familyName: 'Gong', givenName: 'Li'});
joinedNameActors.get(1).get('fullName'); // 'Gong Li'

// automatic change
chineseActors.set({id: 1, givenName: 'Mei'});
joinedNameActors.get(1).get('fullName'); // 'Gong Mei'

// automatic removal
chineseActors.remove(1);
joinedNameActors.get(1); // undefined

// mapped collection has a reference to the underlying collection
joinedNameActors.underlying === chineseActors
```

## Function `deriveMapped`

**Default export** of `@uu-cdh/backbone-collection-transformers/src/mapped-collection.js`, **reexported by name** from the package index.

**Parameter:** `Base`, a collection class to derive from. The base class does not need to be related to the collection type that will serve as an underlying collection. Defaults to `Backbone.Collection`.

**Return value:** mapped collection class that inherits from `Base`. Instances of this class stay automatically in sync with their underlying collections.

**Side effects:** none.

## Mapped collection constructor

This is the return value of `deriveMapped`, discussed above.

Where most collection constructors have two optional parameters, an initial array of models and options, mapped collections take *three* parameters, two of which are required:

- `underlying` (required), the collection to filter over. This *may* be a transformed collection itself.
- `conversion` (required), the conversion relation that determines how a model in the underlying collection should be represented in the mapped collection. This may either be a function that takes a model and returns a model or attributes hash, or a property name or [path][_toPath], in which case it will be referenced from the model's `.attributes` and used as an attributes hash. If your `conversion` produces an attributes hash rather than a full model, make sure that the [`.model`][bb-collection-model] of the mapped collection is configured correctly. This conversion is reevaluated every time a model in the underlying collection is added or changed.
- `options` (optional), the same options accepted by [`Backbone.Collection`][bb-collection-ctor]. The `comparator` and `model` options are potentially useful.

[_toPath]: https://underscorejs.org/#toPath
[bb-collection-model]: https://backbonejs.org/#Collection-model
[bb-collection-ctor]: https://backbonejs.org/#Collection-constructor

## Mapped collection instance

This is the result of `new`ing a mapped collection constructor, discussed above.

In most respects, a mapped collection behaves like its base collection. It contains models, you can listen for the same events and it has all of the same methods. However, you are advised against directly using modifying methods such as `set`, `reset`, `add`, `remove`, `push` and `pop`, because this defeats the purpose of the class (these methods are still present because they are used internally for synchronization). Instead, make changes to the underlying collection and observe any effects that percolate to the mapped collection.

> For the above reason, if you write a function that returns a mapped collection and you document that function, we recommend that you also discuss the possible type(s) of underlying collection.

By default, the models in a mapped collection appear in the same order as their corresponding models in the underlying collection. You can alter this by specifying a [`comparator`][bb-collection-comp]

[bb-collection-comp]: https://backbonejs.org/#Collection-comparator

### Property `underlying`

A reference to the *deepest* underlying collection. That is, if you layer a mapped collection on top of other mapped or filtered collections, then `instance.underlying` will refer to the other end of the transformation chain, i.e., the only collection that is not a transformation over yet another collection.

Generally, if you want to influence the contents of a mapped collection, you should do it through the `underlying` reference:

```js
instance.underlying.add(someModel);
// someModel has been added to instance.underlying.
// someModel, or a transformed version thereof, may or may not have
// been added to instance.
```

> For the curious: there is also a reference to the *direct* underlying collection, which is `_underlying`. Since `instance._underlying` might be a transformed collection itself, it is rarely, if ever, meaningful to access this reference, but we mention it for completeness.

### Method `convert`

The `conversion` that was passed to the [constructor](#mapped-collection-constructor), but coerced to a function. It takes a model of the type contained in the direct underlying collection and returns the corresponding model or attributes hash that would represent it in the mapped collection.

```js
instance.convert(chineseActors.get(1)); // {id: 1, fullName: 'Gong Li'}
```

### Property `cid`

A unique identifier for the mapped collection, kept for administrative purposes. Compare to [`Backbone.Model.cid`][bb-model-cid].

[bb-model-cid]: https://backbonejs.org/#Model-cid

### Property `cidPrefix`

The prefix that the `cid` starts with (see above). Compare to [`Backbone.Model.cidPrefix`][bb-model-cidPrefix]. You probably do not need to override this, unless you subclass a filtered collection class, give it an `id` and create additional administration in which the `cid` might clash with the `id`.

[bb-model-cidPrefix]: https://backbonejs.org/#Model-cidPrefix

### Method `preinitialize`

The [constructor](#mapped-collection-constructor) uses the standard [`preinitialize`][bb-collection-preinit] method for some of its administration. If you subclass a mapped collection class and you need to override this method, make sure to call `super.preinitialize`.

### Method `mappedCid`

> In this case, "cid" refers to the [`cid` of the model][bb-model-cid], **not** to the [`cid` of the collection](#property-cid)!

Given a model from the direct underlying collection, return the `cid` of the corresponding model in the mapped collection.

### Method `getMapped`

Given a model from the underlying collection, return the corresponding model in the mapped collection.

```js
joinedNameActors.getMapped(chineseActors.get(1));
// model with {fullName: 'Gong Li'}
```

### Method `preprocess`

This is an internal method that takes care of the administration when a mapped model is automatically added to the mapped collection. If you subclass a mapped collection and you want to do something special about the way in which models are linked between the underlying and the transformed collection, you may need to interact with this method. In this context, it is worth mentioning that the [`set` method][bb-collection-set] is overridden and that mapped collections also have a `_cidMap` property. Please refer to the source code for details.

[bb-collection-set]: https://backbonejs.org/#Collection-set

### `proxy*` methods

The methods `proxyAdd`, `proxyRemove`, `proxyReset`, `proxySort` and `proxyChange` handle the corresponding events from the directly underlying collection.
