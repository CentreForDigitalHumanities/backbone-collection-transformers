import _ from 'underscore';
import { Model, Collection } from 'backbone';

import MappedCollection from './mapped-collection.js';

// Attributes that will go in the underlying collection.
var butlers = [{
    id: 1,
    name: 'James',
    details: {
        county: 'Bedfordshire',
        flower: 'rose',
        yearsOfService: 26,
    },
}, {
    id: 2,
    name: 'Travis',
    details: {
        county: 'Leicestershire',
        flower: 'lily',
        yearsOfService: 15,
    },
}, {
    id: 3,
    name: 'Mortimer',
    details: {
        county: 'Warwickshire',
        flower: 'tulip',
        yearsOfService: 30,
    },
}];

// A custom model type that will be used in some conversion functions.
class TestModel extends Model {}
TestModel.prototype.idAttribute = 'flower';

// Common properties among the `mapperConfigs` below.
var commonMapperConfigs = {
    // Mappers that propagate the `id` and `name` attributes.
    toplevel: {
        // `comparator` that we will set on the mapped model when we test that
        // it can maintain its own order.
        comparator: 'name',
        // Expected order, based on original indices in the `butlers`, given the
        // above `comparator`.
        expectedOrder: [0, 2, 1],
        // Hash of attributes that we will set on one of the underlying models
        // in order to test how `'change'` events propagate.
        patch: {id: 4, name: 'Edmund'},
        // How to obtain a hash from `patch` above, that we can compare the
        // mapped model against to verify that the change has propagated.
        patchedAttributes: _.identity,
    },
    // Mappers that extract the `details` hash.
    nested: {
        comparator: 'yearsOfService',
        expectedOrder: [1, 0, 2],
        patch: {details: {flower: 'chrysant', age: 44}},
        patchedAttributes: _.property('details'),
    },
};

// We repeat the whole test suite for each type of mapping function configured
// below.
var mapperConfigs = [{
    // The description is used in the `describe()`, but we also detect the
    // keywords `'identity'`, `'function'` and `'model'` for further
    // customization of the tests.
    description: 'the identity function',
    // The mapper is the second argument passed to the `MappedCollection`
    // constructor, a.k.a. the conversion iteratee.
    mapper: _.identity,
    category: 'toplevel',
}, {
    description: 'a function producing a hash with an id',
    mapper: model => model.pick('id', 'name'),
    category: 'toplevel',
}, {
    description: 'a function producing a hash without an id',
    mapper: model => model.get('details'),
    category: 'nested',
}, {
    description: 'a function producing a model without an id',
    // The description says "without an id", yet we are picking the `id`
    // attribute below? That's because `TestModel` uses `'flower'` as its
    // `idAttribute`.
    mapper: model => new TestModel(model.pick('id', 'name')),
    category: 'toplevel',
}, {
    description: 'a function producing a model with an id',
    mapper: model => new TestModel(model.get('details')),
    category: 'nested',
}, {
    description: 'a property iteratee shorthand',
    mapper: 'details',
    category: 'nested',
}];

// Regular expressions that we will repeatedly use to detect the keywords
// mentioned in the `mapperConfigs` above.
var functionPattern = /function/;
var modelPattern = /model/;
var identityPattern = /identity/;

// Given a `source` array and an `order` array of indices, return a new array
// with the elements of `source` in the given `order`.
// reorder(['a', 'b', 'c'], [1, 0, 2]) => ['b', 'a', 'c']
// reorder(['a', 'b', 'c'], [1, 1]) => ['b', 'b']
function reorder(source, order) {
    return _.map(order, _.propertyOf(source));
}

// Repeated pattern to check both the contents and the order of a collection.
function assertOrder(collection, attributes, order) {
    assert.deepStrictEqual(collection.toJSON(), reorder(attributes, order));
}

// Finally! The tests.
describe('MappedCollection', function() {
    beforeEach(function() {
        this.underlying = new Collection(butlers);
    });

    _.each(mapperConfigs, function({description, mapper, category}) {
        var {
            comparator, expectedOrder, patch, patchedAttributes
        } = commonMapperConfigs[category];

        // Remember those keywords we mentioned above?
        var takesModel = functionPattern.test(description);
        var returnsNewModel = modelPattern.test(description);
        var isIdentity = identityPattern.test(description);
        var returnsModel = returnsNewModel || isIdentity;

        describe('with ' + description, function() {
            beforeEach(function() {
                this.mapped = new MappedCollection(this.underlying, mapper);

                // The expected *attributes* of the models in `this.mapped`,
                // which we obviously have to compute without involving any
                // logic from the `./mapped-collection.js` module.
                // During the tests, the models will not always stay in this
                // order; that's why we have the `reorder` helper function.
                this.expected = _.chain(this.underlying.models)
                .map(takesModel ? _.identity : 'attributes')
                .map(mapper)
                .map(returnsModel ? 'attributes' : _.identity)
                .map(_.clone)
                .value();
            });

            // Two more repeated patterns. These functions could have been
            // lifted to module scope, but the assumptions they make about
            // `this` are only valid within the current suite.

            function assertSameOrder(order) {
                assertOrder(this.underlying, butlers, order);
                assertOrder(this.mapped, this.expected, order);
            }

            function assertCorrespondence() {
                this.underlying.each((model, index) => {
                    assert(
                        this.mapped.at(index) === this.mapped.getMapped(model)
                    );
                });
            }

            // Now to business: the specs.

            it('constructs with corresponding models', function() {
                assert.deepStrictEqual(this.mapped.toJSON(), this.expected);
                assertCorrespondence.call(this);
            });

            it('resets along with the underlying collection', function() {
                var spy = sinon.fake();
                this.mapped.on('reset', spy);
                // When we remove all models from the underlying, the mapped
                // collection should empty, too.
                this.underlying.reset();
                assert(spy.callCount === 1);
                assert(this.mapped.isEmpty());
                // Likewise when we put all models back.
                this.underlying.reset(butlers);
                assert(spy.callCount === 2);
                assert.deepStrictEqual(this.mapped.toJSON(), this.expected);
            });

            it('tracks additions and removals', function() {
                var removeSpy = sinon.fake();
                var addSpy = sinon.fake();
                this.mapped.on({remove: removeSpy, add: addSpy});
                // Remove the underlying model with id: 3.
                var sacrifice = this.underlying.get(3);
                var oldCorresponding = this.mapped.getMapped(sacrifice);
                this.underlying.remove(sacrifice);
                assert(removeSpy.callCount === 1);
                assert(removeSpy.calledWith(oldCorresponding, this.mapped, sinon.match.any));
                assert(addSpy.callCount === 0);
                assert(!this.mapped.has(oldCorresponding));
                assert(_.isUndefined(this.mapped.findWhere(this.expected[2])));
                // Restore.
                var successor = this.underlying.add(butlers[2]);
                var newCorresponding = this.mapped.getMapped(successor);
                assert(removeSpy.callCount === 1);
                assert(addSpy.callCount === 1);
                assert(addSpy.calledWith(newCorresponding, this.mapped, sinon.match.any));
                assert(this.mapped.findWhere(this.expected[2]) === newCorresponding);
            });

            it('tracks the underlying order by default', function() {
                var spy = sinon.fake();
                this.mapped.on('sort', spy);
                // Move the third model to the first position.
                this.underlying.unshift(this.underlying.pop());
                assert(spy.callCount === 0);
                assertSameOrder.call(this, [2, 0, 1]);
                // Put the underlying collection in decreasing order of id.
                this.underlying.comparator = ({id}) => -id;
                this.underlying.sort();
                assert(spy.callCount === 1);
                assertSameOrder.call(this, [2, 1, 0]);
            });

            it('can maintain a separate order', function() {
                var spy = sinon.fake();
                var assertSorted = (calls) => {
                    assert(spy.callCount === calls);
                    // We are basically going to verify that, no matter how we
                    // juggle the underlying collection, the mapped collection
                    // will always maintain the order dictated by its
                    // `.comparator`.
                    assertOrder(this.mapped, this.expected, expectedOrder);
                }
                this.mapped.on('sort', spy);
                // Direct sort on the mapped collection.
                _.extend(this.mapped, {comparator}).sort();
                assertSorted(1);
                // Same juggling as in the "tracks additions and removals" spec.
                this.underlying.remove(3);
                this.underlying.add(butlers[2]);
                assertSorted(2);
                // Same juggling as in the "tracks the underlying order" spec.
                this.underlying.unshift(this.underlying.pop());
                assertSorted(3);
                this.underlying.comparator = ({id}) => -id;
                this.underlying.sort();
                // A direct call to `.sort()` on the underlying collection will
                // not even trigger a `'sort'` event, because no models are
                // added. Therefore, still 3 calls on the spy's counter.
                assertSorted(3);
            });

            // As discussed in the `commonMapperConfigs`, the line below
            // produces either an `{id, name}` hash or a `{county, flower,
            // yearsOfService}` hash.
            var checkAttributes = patchedAttributes(patch);

            // In the final spec, we test how the `'change'` event is handled.
            // The mapper needs to be invoked again when this happens. In
            // general, mappers that return a model might vary between producing
            // a newly constructed model and returning a pre-existing model.
            // This distinction does not matter for the current tests; we simply
            // want to ensure that if the mapper currently returns a model,
            // which is not the same model as is already in the collection, then
            // the latter is replaced rather than modified. Our test mappers
            // conveniently fall in one of two categories: always returns a
            // newly constructed model, or never returns a model that wasn't in
            // the collection yet.
            if (returnsNewModel) {
                it('replaces remapped models', function() {
                    // We pick a guinea pig model at random, so this becomes a
                    // "slow fuzz test" if you run it multiple times. Exotic
                    // corner cases due to attribute values or position within
                    // the collection are a bit less likely to go undetected in
                    // this way.
                    var index = _.random(this.underlying.length - 1);
                    var inputModel = this.underlying.at(index);
                    var originalOutput = this.mapped.at(index);
                    assert(originalOutput === this.mapped.getMapped(inputModel));
                    var spy = sinon.fake();
                    originalOutput.on('change', spy);
                    // Modify the guinea pig model.
                    inputModel.set(patch);
                    // The original corresponding model should NOT be modified.
                    assert(spy.notCalled);
                    assert.deepStrictEqual(
                        originalOutput.toJSON(),
                        this.expected[index]
                    );
                    // Instead, it should be replaced by a new model at the same
                    // index.
                    assert(!this.mapped.has(originalOutput));
                    var newOutput = this.mapped.at(index);
                    assert(newOutput !== originalOutput);
                    sinon.assert.match(newOutput.toJSON(), checkAttributes);
                    // All of this magic must obviously happen without otherwise
                    // corrupting the correspondence.
                    assert(this.mapped.length === this.underlying.length);
                    assertCorrespondence.call(this);
                });
            // Otherwise, i.e., when the mapper returns an attributes hash or
            // the same model that was already in the collection, we expect the
            // opposite: the previously mapped model remains where it is and is
            // updated in place.
            } else {
                it('updates previously mapped models', function() {
                    // Again, a "slow fuzz test".
                    var index = _.random(this.underlying.length - 1);
                    var inputModel = this.underlying.at(index);
                    var originalOutput = this.mapped.at(index);
                    assert(originalOutput === this.mapped.getMapped(inputModel));
                    var spy = sinon.fake();
                    originalOutput.on('change', spy);
                    // So far, everything is still the same. Now, modify the
                    // guinea pig again.
                    inputModel.set(patch);
                    // Now the original corresponding model SHOULD be modified,
                    assert(spy.called);
                    assert.notDeepStrictEqual(
                        originalOutput.toJSON(),
                        this.expected[index]
                    );
                    // ... and it should still be in the collection at the same
                    // index, but we retrieve it again just in case this fails
                    // and we need further diagnostics.
                    assert(this.mapped.has(originalOutput));
                    var newOutput = this.mapped.at(index);
                    assert(newOutput === originalOutput);
                    sinon.assert.match(newOutput.toJSON(), checkAttributes);
                    // Since the attributes are updated in place, we
                    // double-check that we are not accidentally leaking the
                    // internal correspondence administration.
                    assert(!newOutput.has('_ucid'));
                    // Finally, double-check for any other possible corruption.
                    assert(this.mapped.length === this.underlying.length);
                    assertCorrespondence.call(this);
                });
            }
        });
    }, this);
});
