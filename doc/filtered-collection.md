# `@uu-cdh/backbone-collection-transformers/src/filtered-collection.js`

[view source](https://github.com/CentreForDigitalHumanities/backbone-collection-transformers/tree/main/src/filtered-collection.js)
[package README](../README.md)

As the name suggests, a filtered collection lets you specify an underlying collection and a selection criterion and obtain a new collection with only the models from the underlying collection that meet the selection criterion. As models in the underlying collection are added, changed and removed, the filtered collection is automatically updated along, emitting its own events as well. A filtered collection is best used as a read-only proxy to its underlying collection.

```js
import { deriveFiltered } from '@uu-cdh/backbone-collection-transformers';

// prepare a filtered collection class so we can instantiate it later
var FilteredCollection = deriveFiltered();

// the underlying collection (see README)
var chineseActors = ...

// the selection criterion
function hasFullName(actorModel) {
    return !!(
        actorModel.get('givenName') && actorModel.get('familyName')
    );
}

// the filtered collection
var fullyNamedActors = new FilteredCollection(chineseActors, hasFullName);

// automatically added to fullyNamedActors
chineseActors.add({id: 1, familyName: 'Gong', givenName: 'Li'});

// not added to fullyNamedActors (family name missing)
chineseActors.add({id: 5, givenName: 'Minzhi'});

// updated in underlying, added to filtered because it now passes
chineseActors.set({id: 5, familyName: 'Wei'});

// updated in underlying, removed from filtered because it now fails
chineseActors.get(1).unset('givenName');

// filtered collection has a reference to the underlying collection
fullyNamedActors.underlying === chineseActors
```

## Function `deriveFiltered`

**Default export** of `@uu-cdh/backbone-collection-transformers/src/filtered-collection.js`, **reexported by name** from the package index.

**Parameter:** `Base`, a collection class to derive from. The base class does not need to be related to the collection type that will serve as an underlying collection. Defaults to `Backbone.Collection`.

**Return value:** filtered collection class that inherits from `Base`. Instances of this class stay automatically in sync with their underlying collections.

**Side effects:** none.

## Filtered collection constructor

This is the return value of `deriveFiltered`, discussed above.

Where most collection constructors have two optional parameters, an initial array of models and options, filtered collections take *three* parameters, two of which are required:

- `underlying` (required), the collection to filter over. This *may* be a transformed collection itself.
- `criterion` (required), the selection criterion that determines whether a model in the underlying collection should also be in the filtered collection. This may either be a function that takes a model and returns a boolean, or any shorthand recognized by [`_.iteratee`][_iteratee], in which case it will be applied to the model's `.attributes`. This criterion is reevaluated every time a model in the underlying collection is added or changed.
- `options` (optional), the same options accepted by [`Backbone.Collection`][bb-collection-ctor]. The `comparator` option is potentially useful.

[_iteratee]: https://underscorejs.org/#iteratee
[bb-collection-ctor]: https://backbonejs.org/#Collection-constructor

## Filtered collection instance

This is the result of `new`ing a filtered collection constructor, discussed above.

In most respects, a filtered collection behaves like its base collection. It contains models, you can listen for the same events and it has all of the same methods. However, you are advised against directly using modifying methods such as `set`, `reset`, `add`, `remove`, `push` and `pop`, because this defeats the purpose of the class (these methods are still present because they are used internally for synchronization). Instead, make changes to the underlying collection and observe any effects that percolate to the filtered collection.

> For the above reason, if you write a function that returns a filtered collection and you document that function, we recommend that you also discuss the possible type(s) of underlying collection.

### Property `underlying`

A reference to the *deepest* underlying collection. That is, if you layer a filtered collection on top of other filtered or mapped collections, then `instance.underlying` will refer to the other end of the transformation chain, i.e., the only collection that is not a transformation over yet another collection.

Generally, if you want to influence the contents of a filtered collection, you should do it through the `underlying` reference:

```js
instance.underlying.add(someModel);
// someModel has been added to instance.underlying.
// someModel, or a transformed version thereof, may or may not have
// been added to instance.
```

> For the curious: there is also a reference to the *direct* underlying collection, which is `_underlying`. Since `instance._underlying` might be a transformed collection itself, it is rarely, if ever, meaningful to access this reference, but we mention it for completeness.

### Property `criterion`

The filtering criterion that was originally passed to the [constructor](#filtered-collection-constructor).

### Method `matches`

The `criterion` (see above) but coerced to a function. This may be useful to quickly test whether any given model passes the selection criterion.

```js
instance.matches(someModel); // true or false
```

### Method `preinitialize`

The [constructor](#filtered-collection-constructor) uses the standard [`preinitialize`][bb-collection-preinit] method for some of its administration. If you subclass a filtered collection class and you need to override this method, make sure to call `super.preinitialize`.

### `proxy*` methods

The methods `proxyAdd`, `proxyRemove`, `proxyReset`, `proxySort` and `proxyChange` handle the corresponding events from the directly underlying collection.
