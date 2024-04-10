import assert from 'assert';

import _ from 'underscore';
import { Collection } from 'backbone';

import { deriveConstructor } from './inheritance.js';

var OldBase = Collection.extend({
    preinitialize: function(models, options) {
        this.oldPreinitProp = 'oldPreinitProp';
    },
    initialize: function(models, options) {
        this.oldInitProp = 'oldInitProp';
    }
});

class NewBase extends Collection {
    preinitialize(models, options) {
        this.newPreinitProp = 'newPreinitProp';
    }
    initialize(models, options) {
        this.newInitProp = 'newInitProp';
    }
}

function deriveOld(Base) {
    return Base.extend({
        preinitialize(models, options) {
            super.preinitialize(models, options);
            this.oldDerivedPreinit = 'oldDerivedP';
        },
        initialize(models, options) {
            super.initialize(models, options);
            this.oldDerivedInit = 'oldDerivedInit';
        },
        oldProtoProp: 'oldProtoProp'
    });
}

function deriveNew(Base) {
    class Derived extends Base {}
    _.extend(Derived.prototype, {
        preinitialize(models, options) {
            super.preinitialize(models, options);
            this.newDerivedPreinit = 'newDerivedP';
        },
        initialize(models, options) {
            super.initialize(models, options);
            this.newDerivedInit = 'newDerivedInit';
        },
        newProtoProp: 'newProtoProp'
    });
    return Derived;
}

function describeWithBase(Base) {
    ;
}

describe('deriveConstructor', function() {
    _.each({old: OldBase, 'new': NewBase}, function(base, age) {
        describe('with ' + age + ' base', _.partial(describeWithBase, base));
    });
});
