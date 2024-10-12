/**
 * Class mixin with common functionality for collections that act as a proxy to
 * some underlying collection. This enables clients of such proxy classes to
 * transparently retrieve the underlying collection, even when there are
 * multiple layers of proxy collections in between.
 * @mixin CollectionProxy
 */
export default Object.freeze(/** @lends CollectionProxy */{
    /**
     * Classes using this mixin should use this property internally to access
     * the direct underlying collection, which may or may not be a proxy itself.
     * @member {Backbone.Collection} _underlying
     */

    /**
     * Clients can this getter to transparently retrieve the innermost
     * underlying collection, even when there are multiple layers of proxies in
     * between.
     * @member {Backbone.Collection}
     */
    get underlying() {
        var deep = this._underlying;
        var deeper = deep.underlying;
        return deeper || deep;
    }
});
