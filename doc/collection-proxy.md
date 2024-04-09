```javascript
import mixin from '../core/mixin';
import BaseCollection from '../anywhere';
import ProxyMixin from '../core/collection-proxy';

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
