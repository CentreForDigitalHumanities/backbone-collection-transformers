import assert from 'assert';
import sinon from 'sinon';

import _ from 'underscore';
import { Model, Collection } from 'backbone';

import deriveFiltered from './filtered-collection.js';

var testAddition = {
    id: 6,
    x: 10,
    a: 1,
};

var testRemoval = {
    id: 3,
    y: 3,
    z: 8,
};

var testUpdate = {
    id: 1,
    x: 2,
    y: 5,
    b: 9,
};

var exampleData = [{
    id: 1,
    x: 10,
    y: 5,
}, {
    id: 2,
    x: 10,
    z: 8,
}, testRemoval, {
    id: 4,
    x: 2,
    y: 3,
    z: 4,
}, {
    id: 5,
    a: 1,
    b: 9,
}];

class CustomModel extends Model {}

class CustomCollection extends Collection {
    get foo() { return 'bar'; }
}

// Our test suite. We are going to run it twice: once for the default base class
// and once for the above custom base class.
function testFiltered(FilteredCollection, isCustom) {
    var raw, filtered, spy;

    before(function() {
        spy = sinon.fake();
    });

    beforeEach(function() {
        raw = new Collection(exampleData);
        assert(raw.length === 5);
    });

    afterEach(function() {
        spy.resetHistory();
    });

    if (isCustom) {
        it('derives from the custom base class', function() {
            assert(FilteredCollection.prototype instanceof CustomCollection);
            assert(FilteredCollection.prototype.foo === 'bar');
        });
    } else {
        it('derives from Backbone.Collection', function() {
            assert(
                Object.getPrototypeOf(FilteredCollection.prototype)
                    === Collection.prototype
            );
            assert(!_.has(FilteredCollection.prototype, 'foo'));
        });
    }

    it('keeps only matching models from the underlying collection', function() {
        filtered = new FilteredCollection(raw, m => m.has('x'));
        assert(filtered.underlying === raw);
        assert(filtered.length === 3);
    });

    it('triggers "add" for matching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('x'));
        filtered.on('add', spy);
        raw.add(testAddition);
        assert(spy.callCount === 1);
        assert(filtered.length === 4);
    });

    it('does not trigger "add" for nonmatching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('y'));
        filtered.on('add', spy);
        raw.add(testAddition);
        assert(spy.callCount === 0);
        assert(filtered.length === 3);
    });

    it('triggers "remove" for matching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('y'));
        filtered.on('remove', spy);
        raw.remove(testRemoval);
        assert(spy.callCount === 1);
        assert(filtered.length === 2);
    });

    it('does not trigger "remove" for nonmatching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('x'));
        filtered.on('remove', spy);
        raw.remove(testRemoval);
        assert(spy.callCount === 0);
        assert(filtered.length === 3);
    });

    it('triggers "change" for matching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('x'));
        filtered.on('change', spy);
        raw.set(testUpdate, {merge: true, remove: false});
        assert(spy.callCount === 1);
    });

    it('does not trigger "change" for nonmatching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('z'));
        filtered.on('change', spy);
        raw.set(testUpdate, {merge: true, remove: false});
        assert(spy.callCount === 0);
    });

    it('triggers "change:[attr]" for matching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('x'));
        filtered.on('change:x', spy);
        raw.set(testUpdate, {merge: true, remove: false});
        assert(spy.callCount === 1);
    });

    it('does not trigger "change:[attr]" for nonmatching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('z'));
        filtered.on('change:x', spy);
        raw.set(testUpdate, {merge: true, remove: false});
        assert(spy.callCount === 0);
    });

    it('triggers "update" for matching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('x'));
        filtered.on('update', spy);
        raw.add(testAddition);
        assert(spy.callCount === 1);
    });

    it('does not trigger "update" for nonmatching models', function() {
        filtered = new FilteredCollection(raw, m => m.has('y'));
        filtered.on('update', spy);
        raw.add(testAddition);
        assert(spy.callCount === 0);
    });

    it('adopts models when they become matching', function() {
        filtered = new FilteredCollection(raw, m => m.has('b'));
        filtered.on('add', spy);
        raw.set(testUpdate, {merge: true, remove: false});
        assert(spy.callCount === 1);
        assert(filtered.length === 2);
    });

    it('purges models when they become nonmatching', function() {
        filtered = new FilteredCollection(raw, m => m.get('x') === 10);
        filtered.on('remove', spy);
        raw.set(testUpdate, {merge: true, remove: false});
        assert(spy.callCount === 1);
        assert(filtered.length === 1);
    });

    it('resets together with the underlying collection', function() {
        filtered = new FilteredCollection(raw, m => m.has('y'));
        filtered.on('reset', spy);
        raw.reset();
        assert(spy.callCount === 1);
        assert(filtered.length === 0);
    });

    it('works with the attribute name iteratee shorthand', function() {
        filtered = new FilteredCollection(raw, 'x');
        filtered.on('add remove update', spy);
        raw.add(testAddition);
        assert(spy.callCount === 2);
        assert(filtered.length === 4);
        raw.remove(exampleData[0]);
        assert(spy.callCount === 4);
        assert(filtered.length === 3);
    });

    it('works with the object matcher iteratee shorthand', function() {
        filtered = new FilteredCollection(raw, {x: 10});
        filtered.on('add remove update', spy);
        raw.add(testAddition);
        assert(spy.callCount === 2);
        assert(filtered.length === 3);
        raw.set(testUpdate, {merge: true, remove: false});
        assert(spy.callCount === 4);
        assert(filtered.length === 2);
    });

    it('adopts the .model from the underlying collection', function() {
        var raw = new Collection([], { model: CustomModel });
        filtered = new FilteredCollection(raw, 'x');
        assert(filtered.model === raw.model);
    });
}

describe('deriveFiltered', function() {
    describe(
        'by default derives a filtered collection class from Backbone.Collection, which',
        _.partial(testFiltered, deriveFiltered(), false)
    );
    describe(
        'may also derive a filtered collection class from a custom base, which',
        _.partial(testFiltered, deriveFiltered(CustomCollection), true)
    );
});
