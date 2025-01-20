import assert from 'assert';

import { Model, Collection } from 'backbone';
import { mixin } from '@uu-cdh/backbone-util';

import ProxyMixin from './proxy-mixin.js';

class IntermediateA extends Collection {
    constructor(underlying) {
        super();
        this._underlying = underlying;
    }
}
mixin(IntermediateA.prototype, ProxyMixin);

class IntermediateB extends Collection {
    constructor(underlying) {
        super();
        this._underlying = underlying;
    }
}
mixin(IntermediateB.prototype, ProxyMixin);

describe('ProxyMixin', function() {
    it('unwraps multiple levels of collection proxies', function() {
        var bottom = new Collection();
        var middle = new IntermediateA(bottom);
        var top = new IntermediateB(middle);
        assert(middle._underlying === bottom);
        assert(middle.underlying === bottom);
        assert(top._underlying === middle);
        assert(top.underlying === bottom);
    });
});
