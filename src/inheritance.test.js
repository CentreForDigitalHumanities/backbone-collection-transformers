import assert from 'assert';
import sinon from 'sinon';

import _ from 'underscore';
import { Collection } from 'backbone';

import { deriveConstructor } from './inheritance.js';

var baseProtoProps = {
    preinitialize: function(models, options) {
        this.basePreinitProp = 'basePreinitProp';
    },
    initialize: function(models, options) {
        this.baseInitProp = 'baseInitProp';
    },
    baseProtoProp: 'baseProtoProp'
};

var OldBase = Collection.extend(baseProtoProps);

class NewBase extends Collection {}
_.extend(NewBase.prototype, baseProtoProps);

function derivedProtoProps(Base) {
    return {
        preinitialize(models, options) {
            Base.prototype.preinitialize.call(this, models, options);
            this.derivedPreinitProp = 'derivedPreinitProp';
        },
        initialize(models, options) {
            Base.prototype.initialize.call(this, models, options);
            this.derivedInitProp = 'derivedInitProp';
        },
        derivedProtoProp: 'derivedProtoProp'
    };
}

function deriveOld(Base) {
    return Base.extend(derivedProtoProps(Base));
}

function deriveNew(Base) {
    class Derived extends Base {}
    _.extend(Derived.prototype, derivedProtoProps(Base));
    return Derived;
}

function assertOwn(object, key, value) {
    assert(object.hasOwnProperty(key));
    assert(object[key] === value);
}

function assertInherited(object, key, value) {
    assert(!object.hasOwnProperty(key));
    assert(object[key] === value);
}

function describeWithBase(Base) {
    var Middle = Base.extend({
        constructor: deriveConstructor(Base, function(models, options) {
            return [models, options];
        }, function() {
            this.middleCtorProp = 'middleCtorProp';
        }),
        middleProtoProp: 'middleProtoProp'
    });

    var modelInit = [{}, {}];
    var collectionOpts = {comparator: 'id'};

    function assertMiddleInstance(instance) {
        assert(instance instanceof Middle);
        sinon.assert.match(instance, collectionOpts);
        assert(instance.length === modelInit.length);
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
            var instance = Middle.call(
                Object.create(Middle.prototype),
                modelInit,
                collectionOpts
            );
            assertMiddleInstance(instance);
        });
    });

    _.each({old: deriveOld, 'new': deriveNew}, function(derive, age) {
        describe('derived in the ' + age + ' way', function() {
            var Derived = derive(Middle);

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

describe('deriveConstructor', function() {
    _.each({old: OldBase, 'new': NewBase}, function(base, age) {
        describe('with ' + age + ' base', _.partial(describeWithBase, base));
    });
});
