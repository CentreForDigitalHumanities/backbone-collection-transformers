import assert from 'assert';
import sinon from 'sinon';

import _ from 'underscore';
import { Collection } from 'backbone';

import { deriveConstructor, parent } from './inheritance.js';

// In these tests, we will build a three-layer class hierarchy on top of
// `Backbone.Collection`. We could have gone with any other class or even
// `Object`, but `Backbone.Collection` happens to be a class that we want to
// work with in this package, it has old-style class emulation built in, and
// since it is quite sophisticated, there is also a larger surface of possible
// failure points. We will name the layers as follows:
//
// 1. `Base` - a direct subclass of `Backbone.Collection`.
// 2. `Middle` - a direct subclass of `Base`.
// 3. `Derived` - a direct subclass of `Middle`.
//
// The `Middle` will be derived using our `deriveConstructor`. The layers below
// and above are varied in order to test for compatibility: both `Base` and
// `Derived` will have an old style and a new style variant, so there will be
// four variants of the hierarchy in total. The old style variants are derived
// using Backbone's `.extend` static method, while the new style variants are
// derived using the `class` keyword. In all four variants of the hierarchy, we
// want to obtain the exact same results.
//
// We will roughly perform the following checks:
//
// - Properties set in the prototypes are preserved throughout the hierarchy.
// - Properties set inside the constructors are preserved and set on the instance.
// - `Backbone.Collection` behavior is preserved throughout the hierarchy.
//
// In the `Base` and `Derived` layers, we do not touch the constructor directly;
// instead, we use `Backbone.Collection`'s `preinitialize` and `initialize`
// methods in order to set instance properties. This lets us test with the
// default constructors provided by `.extend` and `class`, which are arguably
// the most neutral. Doing this also rules out the possibility of false
// positives or false negatives due to our own mistakes.
//
// Of course, in the `Middle` layer we *do* touch the constructor directly,
// since this is the very topic of our tests. With this summary out of the way,
// let's start!

// Our extensions for the `Base` layer.
var baseProtoProps = {
    preinitialize: function(models, options) {
        this.basePreinitProp = 'basePreinitProp';
    },
    initialize: function(models, options) {
        this.baseInitProp = 'baseInitProp';
    },
    baseProtoProp: 'baseProtoProp'
};

// `Base` layer, old variant.
var OldBase = Collection.extend(baseProtoProps);

// `Base` layer, new variant.
class NewBase extends Collection {}
_.extend(NewBase.prototype, baseProtoProps);

// Given a constructor for the `Middle` layer, compose a mixin for the `Derived`
// layer.
function derivedProtoProps(Middle) {
    return {
        preinitialize(models, options) {
            // We could not use `super` here, because `super` has lexical scope.
            // In other words, `super.preinitialize` would attempt to call
            // `Object.prototype.preinitialize` (which does not exist).
            Middle.prototype.preinitialize.call(this, models, options);
            this.derivedPreinitProp = 'derivedPreinitProp';
        },
        initialize(models, options) {
            Middle.prototype.initialize.call(this, models, options);
            this.derivedInitProp = 'derivedInitProp';
        },
        derivedProtoProp: 'derivedProtoProp'
    };
}

// Create the `Derived` layer in the old way.
function deriveOld(Middle) {
    return Middle.extend(derivedProtoProps(Middle));
}

// Create the `Derived` layer in the new way.
function deriveNew(Middle) {
    class Derived extends Middle {}
    _.extend(Derived.prototype, derivedProtoProps(Middle));
    return Derived;
}

// We often need to check whether an object has an *own* property with given
// name and value. This happens with properties that were set in constructors.
function assertOwn(object, key, value) {
    assert(object.hasOwnProperty(key));
    assert(object[key] === value);
}

// Likewise with *inherited* properties. This happens with properties that were
// set in mixins.
function assertInherited(object, key, value) {
    assert(!object.hasOwnProperty(key));
    assert(object[key] === value);
}

// The body of a `describe` that we will repeat twice, once for the old style
// `Base` and once for the new style `Base`. The lines that do the repetition
// are at the bottom of this test module.
function describeWithBase(Base) {
    // Notice how a constructor written with `deriveConstructor` is still quite
    // similar to any other constructor:
    var Middle = deriveConstructor(Base, function(models, options) {
        // First, the part before the `super` call. It ends by returning the
        // list of arguments that will be passed to `super`.
        return [models, options];
    }, function() {
        // Then, the part after the `super` call, where we do things with `this`
        // and optionally return a different object as the final result.
        this.middleCtorProp = 'middleCtorProp';
    })
    Middle.prototype.middleProtoProp = 'middleProtoProp';

    // The arguments that we pass to the constructors everywhere.
    var modelInit = [{}, {}];
    var collectionOpts = {comparator: 'id'};

    // We expect any instance of `Middle` to pass all of the following
    // assertions:
    function assertMiddleInstance(instance) {
        // - obviously, it is an instance of `Middle` (but this could fail!);
        assert(instance instanceof Middle);
        // - `Backbone.Collection` behavior still works;
        sinon.assert.match(instance, collectionOpts);
        assert(instance.length === modelInit.length);
        // - all the properties are inherited and initialized correctly.
        assertOwn(instance, 'basePreinitProp', 'basePreinitProp');
        assertOwn(instance, 'baseInitProp', 'baseInitProp');
        assertInherited(instance, 'baseProtoProp', 'baseProtoProp');
        assertOwn(instance, 'middleCtorProp', 'middleCtorProp');
        assertInherited(instance, 'middleProtoProp', 'middleProtoProp');
    }

    it('returns a function', function() {
        assert(_.isFunction(Middle));
    });

    describe('the function', function() {
        it('has a correct prototype chain', function() {
            assert(Middle.prototype instanceof Base);
            assert(Base.prototype instanceof Collection);
        });

        it('works with new', function() {
            var instance = new Middle(modelInit, collectionOpts);
            assertMiddleInstance(instance);
        });

        it('works without new', function() {
            // This is the type of `super` call that one would often find in old
            // style class emulation.
            var instance = Middle.call(
                Object.create(Middle.prototype),
                modelInit,
                collectionOpts
            );
            assertMiddleInstance(instance);
        });
    });

    // Now, we nest the repetition for old and new style `Derived` layers.
    _.each({old: deriveOld, 'new': deriveNew}, function(derive, age) {
        describe('derived in the ' + age + ' way', function() {
            // The derivation looks rather short here, because we already
            // abstracted all of it away in the `deriveOld` and `deriveNew`
            // functions.
            var Derived = derive(Middle);

            // For the instances of `Derived`, we still have all of the same
            // expectations as for `Middle`, plus some more.
            function assertDerivedInstance(instance) {
                assertMiddleInstance(instance);
                assert(instance instanceof Derived);
                assertOwn(instance, 'derivedPreinitProp', 'derivedPreinitProp');
                assertOwn(instance, 'derivedInitProp', 'derivedInitProp');
                assertInherited(instance, 'derivedProtoProp', 'derivedProtoProp');
            }

            it('extends the prototype chain', function() {
                assert(Derived.prototype instanceof Middle);
            });

            it('produces a valid constructor again', function() {
                var instance = new Derived(modelInit, collectionOpts);
                assertDerivedInstance(instance);
            });
        });
    })
}

// Finally, here are the lines that actually arrange the repetition of the main
// suite.
describe('deriveConstructor', function() {
    _.each({old: OldBase, 'new': NewBase}, function(base, age) {
        describe('with ' + age + ' base', _.partial(describeWithBase, base));
    });
});

// And then there are some tests for the `parent` function. We can reuse
// `OldBase` for this purpose. We do not expect different behavior for
// `NewBase`.
describe('parent', function() {
    it('retrieves the parent constructor of a constructor', function() {
        assert(parent(OldBase) === Collection);
    });

    it('retrieves the parent prototype of an instance', function() {
        var instance = new OldBase;
        assert(parent(instance) === Collection.prototype);
    });

    it('retrieves the parent prototype of a plain object', function() {
        var base = {};
        var derived = _.create(base);
        assert(parent(derived) === base);
    });
});
