# @uu-cdh/backbone-collection-transformers

Filtering and mapping for collections, with automatic synchronization.

[Rationale](#rationale) | [Quickstart](#quickstart) | [Compatibility](#compatibility) | [Reference](#reference) | [Planned](#planned-features) | [Support](#support) | [Development](CONTRIBUTING.md) | [BSD 3-Clause](LICENSE)

## Rationale

[`Backbone.Collection`][bb-collection] has `map` and `filter` methods, but these methods just return arrays. Would it not be nice if we could have `map` and `filter` operations that produce new collections, and those new collections would also automatically stay in sync with the input collection? That is what we thought, and that is what this package provides.

One may sometimes want to take a custom collection class and then add the ability to filter or map over another collection. For this reason, we do not provide a single `FilteredCollection` class and a single `MappedCollection` class, but the functions [`deriveFiltered`](doc/filtered-collection.md) and [`deriveMapped`](doc/mapped-collection.md), which let you extend any arbitrary collection class with these abilities.

Just like with the familiar `map` and `filter` functions, there are many situations where we may want to stack multiple transformations on top of each other. This is transparently supported. All mapped and filtered collections have an `underlying` property, which lets you directly access the source collection even under many layers of transformation.

Mapping and filtering are just two of many conceivable transformations. If you need to implement a new collection transformer, you can tap into the same transparency by mixing our [`CollectionProxy`](doc/collection-proxy.md) into your transformer class.

[backbone]: https://backbonejs.org/
[bb-collection]: https://backbonejs.org/#Collection
[bb-col-extend]: https://backbonejs.org/#Collection-extend

## Quickstart

We recommend a workflow in which you install dependencies from [npm](https://npmjs.com/) and bundle them with a tool such as Rollup.

``` bash
// could also use yarn, pnpm, etcetera
npm add @uu-cdh/backbone-collection-transformers
```

You can also use the library directly from a browser embed, but you may need to set up [import maps][import-map] in that case.

[import-map]: https://developer.mozilla.org/docs/Web/HTML/Element/script/type/importmap
[ts-mixin]: https://www.typescriptlang.org/docs/handbook/mixins.html

```js
import { Collection } from 'backbone';
import { deriveFiltered, deriveMapped } from '@uu-cdh/backbone-collection-transformers';

// Input collection.
var chineseActors = new Collection([{
    id: 1,
    familyName: 'Gong',
    givenName: 'Li',
}, {
    id: 2,
    givenName: 'Lianjie',
}, {
    id: 3,
    familyName: 'Ge',
    givenName: 'You'
}, {
    id: 4,
    familyName: 'Zhang',
}, {
    id: 5,
    givenName: 'Minzhi',
}]);

// Create a filtered collection class. Derives from Backbone.Collection
// by default.
var FilteredCollection = deriveFiltered();

// Create a filtered collection with only the actors that have both a
// family name and a given name.
function hasFullName(actor) {
    return !!(actor.get('givenName') && actor.get('familyName'));
}
var fullyNamedActors = new FilteredCollection(chineseActors, hasFullName);

// Create a mapped collection class.
var MappedCollection = deriveMapped();

// Create a mapped collection where the name of each fully named actor is
// joined.
function joinName(actor) {
    var {familyName, givenName, ...otherAttributes} = actor.attributes;
    var fullName = `${familyName} ${givenName}`;
    return {fullName, ...otherAttributes};
}
var joinedNameActors = new MappedCollection(fullyNamedActors, joinName);

// Two layers of transformation: first filtered, then mapped.
joinedNameActors.toJSON();
// [
//     {id: 1, fullName: 'Gong Li'},
//     {id: 3, fullName: 'Ge You'},
// ]

// Both layers automatically change along with changes in the input.
chinesActors.set({id: 2, familyName: 'Li'});
// joinedNameActors now also contains {id: 2, fullName: 'Li Lianjie'}
chinesActors.remove(3);
// joinedNameActors no longer contains {id: 3, fullName: 'Ge You'}

// Changes can be observed with the usual events.
chineseActors.set({id: 1, givenName: 'Mei'});
// triggered 'change:fullName' on joinedNameActors.get(1)

// Even under multiple layers of transformations, we can always access the
// original input collection.
joinedNameActors.underlying; // chineseActors
```

## Compatibility

We jumped some burning hoops to ensure that `deriveFiltered` and `deriveMapped` can operate both on classic [`Collection.extend`][bb-col-extend] classes and modern `class` classes. Conversely, both types of classes can extend from the classes produced by `deriveFiltered` and `deriveMapped`. This was [less trivial than one might expect][so-classes], and we had to sacrifice some backwards compatibility with older JavaScript engines in order to make it possible.

[so-classes]: https://stackoverflow.com/q/33369131

That being said, we tried our best to contain the damage. Only syntax and standard APIs are used that have been widely supported at least since May 2016. Unless you target an engine older than that (such as Internet Explorer 11), no transpilation or polyfilling should be required.

## Reference

- [collection-proxy](collection-proxy.md)
- [filtered-collection](filtered-collection.md)
- [mapped-collection](mapped-collection.md)

## Planned features

We do not have any concrete plans to add any particular other type of collection transformer. That being said, we can easily think of many totally reasonable transformations. For example grouping, sampling, partitioning or chunking. How about zipping, interleaving, intersecting or diffing multiple collections into one? Or even collapsing an entire collection into a single model with reduce or min/max? Or the other way round: exploding a single model into a collection of key/value pairs? If you find a need for a transformation other than mapping or filtering, please let us know and feel welcome to contribute it yourself.

## Support

Please report security issues to cdh@uu.nl. For regular bugs, feature requests or any other feedback, please use our [issue tracker][issues].

[issues]: https://github.com/CentreForDigitalHumanities/backbone-collection-transformers/issues

## Development

Please see the [CONTRIBUTING](CONTRIBUTING.md) for everything related to testing, pull requests, versioning, etcetera.

## License

Licensed under the terms of the three-clause BSD license. See [LICENSE](LICENSE).
