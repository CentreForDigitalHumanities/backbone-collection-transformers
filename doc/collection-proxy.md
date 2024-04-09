```javascript
import { mixin } from '@uu-cdh/backbone-util';
import { ProxyMixin } from '@uu-cdh/backbone-collection-transformers';
import BaseCollection from '../anywhere';

interface ProxyCollection extends ProxyMixin {}
class ProxyCollection extends BaseCollection {
    constructor/initialize/preinitialize() {
        this._underlying = // the direct underlying collection
    }
}
mixin(ProxyCollection.prototype, ProxyMixin.prototype);

const aProxy = new ProxyCollection(...);
// aProxy.underlying transparently traverses any intermediate proxies
aProxy.underlying.add(...);
```
