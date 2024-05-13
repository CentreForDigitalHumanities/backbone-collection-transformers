/**
 * Given a base constructor, derive a child constructor that is compatible both
 * with old style and new style class emulation.
 * @param {deriveConstructor~Base} Base - Constructor to derive from. This can
 * either be an old-fashioned function that modifies `this` or a modern `class`.
 * @param {deriveConstructor~prepareCb} prepare - Callback that will receive the
 * same arguments as the derived constructor and which returns an array with
 * arguments to pass to the base constructor.
 * @param {deriveConstructor~initCb} initialize - Callback that initializes the
 * instance of the derived constructor after the base constructor has run.
 * @returns {deriveConstructor~Derived} Derived constructor which can be further
 * subclassed both with regular functions and the new `class` syntax.
 */
export function deriveConstructor(Base, prepare, initialize) {
    // We start with some JSDoc comments in order to document the argument types
    // for IDE users who rely on that kind of thing. Please bear with us.

    /** Base class to derive from. @class Base */

    /**
     * Computes arguments to {@link deriveConstructor~Base} from arguments to
     * {@link deriveConstructor~Derived}.
     * @callback prepareCb
     * @param {...*} args - Arguments that are passed to the derived constructor.
     * @returns {*[]} Array with the arguments to pass to the base constructor.
     */

    /**
     * Initializes the instance of {@link deriveConstructor~Derived} after
     * {@link deriveConstructor~Base} has completed.
     * @callback initCb
     * @this deriveConstructor~Derived
     * @param {*[]} childArgs - Arguments passed to the derived constructor.
     * @param {*[]} parentArgs - Arguments to the base constructor, as computed
     * by {@link deriveConstructor~prepareCb}.
     */

    // Wew! Back to business.

    /**
     * Constructor derived from {@link deriveConstructor~Base}.
     * @class
     */
    function Derived(...args) {
        var parentArgs = prepare(...args);
        var target = new.target || this && this.constructor || Derived;
        var instance = Reflect.construct(Base, parentArgs, target);
        var result = initialize.call(instance, args, parentArgs);
        return result || instance;
    }
    // Create proper prorotype chain without calling Base.
    Derived.prototype = Object.create(Base.prototype);
    Derived.prototype.constructor = Derived;
    // Inherit static properties.
    Object.setPrototypeOf(Derived, Base);
    return Derived;
}
