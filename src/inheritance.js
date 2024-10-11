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
    // Create proper prototype chain without calling Base.
    Derived.prototype = Object.create(Base.prototype);
    Derived.prototype.constructor = Derived;
    // Inherit static properties.
    Object.setPrototypeOf(Derived, Base);
    return Derived;
}

/**
 * Retrieve the parent constructor or prototype of a constructor, class instance
 * or other object. This function can be used as a generic `super` emulator, but
 * dynamically scoped.
 * @param {function|object} child - Function or object of which to retrieve the
 * parent.
 * @returns {function|object|null} If the `child` is a constructor, its parent
 * constructor; if the `child` is an instance of a class, the prototype of its
 * superclass; in all remaining cases, the prototype of `child`.
 */
export function parent(child) {
    // Catch invalid input early to prevent runtime errors.
    if (!child) return undefined;
    // `child` might be a constructor, in which case we want to proceed from its
    // `prototype`.
    var instance = child.prototype || child;
    var prototype = Object.getPrototypeOf(instance);
    // If `child` is a constructor, we are done; the constructor of `child`'s
    // prototype's prototype is what we need.
    if (child !== instance) return prototype.constructor;
    // If `child` is the prototype of a constructor, then its prototype is what
    // we need.
    if (child.hasOwnProperty('constructor')) return prototype;
    // If `child` derived directly from another object through `Object.create`
    // or similar, we are also done; that base is what we need.
    if (!prototype.hasOwnProperty('constructor')) return prototype;
    // In remaining cases, we are dealing with an instance of a class. The
    // methods of its prototype are generally what we expect to call already
    // when we write `this.method()`, so we need to go one layer deeper.
    return Object.getPrototypeOf(prototype);
}
