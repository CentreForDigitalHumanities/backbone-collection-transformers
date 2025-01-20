# `@uu-cdh/backbone-collection-transformers/src/proxy-mixin.js`

[view source](https://github.com/CentreForDigitalHumanities/backbone-collection-transformers/tree/main/src/proxy-mixin.js)
[package README](../README.md)

This module provides a mixin that supplies the `underlying` accessor. This accessor makes it possible to directly retrieve the source collection from a transformed collection, no matter how many transformations are layered in between. Since each layer of transformation acts as a proxy to the lower layers, we generalize the concept of a transformed collection to a *proxy collection*. `ProxyMixin` is the mixin that turns any collection class into a proxy collection class.

The following example code demonstrates how to apply the mixin. Note that the proxy class constructor needs to set `this._underlying` to the layer directly below itself; the `underlying` accessor then takes care of traversing any additional layers, if `this._underlying` happens to be a proxy as well.

```typescript
import { mixin } from '@uu-cdh/backbone-util';
import { ProxyMixin } from '@uu-cdh/backbone-collection-transformers';
import BaseCollection from '../anywhere';

// The next line is only needed in TypeScript.
interface ProxyCollection extends ProxyMixin {}
class ProxyCollection extends BaseCollection {
    constructor/initialize/preinitialize() {
        this._underlying = // the direct underlying collection
    }
}
mixin(ProxyCollection.prototype, ProxyMixin);

const aProxy = new ProxyCollection(...);
// aProxy.underlying transparently traverses any intermediate proxies
aProxy.underlying.add(...);
```

`ProxyMixin` is written in such a generic way, that it could also be used for non-collection or even non-Backbone transformation hierarchies. Your imagination is the limit.
