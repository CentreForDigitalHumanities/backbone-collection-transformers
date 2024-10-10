# `@uu-cdh/backbone-collection-transformers/src/inheritance.js`

[view source](https://github.com/CentreForDigitalHumanities/backbone-collection-transformers/tree/main/src/inheritance.js)
[package README](../README.md)

> This module should probably be a separate library. Please do not count on it staying in its current location in the future. For this reason, we do not include it in the package index and we do not mention it in the README (so kudos for finding it anyway). **Please consider it an implementation detail until we find the time to outfactor it.** Nevertheless, the module deserves some documentation.

This module exists to even out some subtle gotchas and backwards incompatibilities in modern JavaScript. In particular, it addresses problems with the `class` and `super` keywords that make it difficult to integrate legacy code with code that uses all of the newest syntax.

## Backstory: inheritance in JavaScript

Despite the fact that JavaScript now has a `class` keyword, it still does not have classes. Instead, it has prototypal inheritance. In a nutshell, inheritance works like this:

```js
// Any object can be a prototype.
var base = {word: 'hello'};

// Use base as the prototype for a new object.
var derived = Object.create(base);

// derived really is a separate object:
assert(derived !== base);
assert(!derived.hasOwnProperty('word'));

// ... but it inherits from base:
assert(Object.getPrototypeOf(derived) === base);
assert(derived.word === 'hello');
```

`Object.create` is a relatively recent addition to the language. Before it existed, the same effect could already be obtained by using a *constructor* and the `new` keyword:

```js
// The constructor. It is just a function, but we start the name with
// a capital letter by convention to indicate its purpose.
function Base() {}

// Note that the above function does nothing. The main trick is not in
// the function itself, but in its prototype property. It defaults to
// Object.prototype, but we can set it to any object that we want to use
// as prototype.
Base.prototype = base;

// Now, when we call Base with the new keyword, we obtain a new object
// that has base as its prototype.
var derived = new Base();
assert(Object.getPrototypeOf(derived) === base);
```

The constructor can access the newly created object through its `this` binding. This mechanism is useful; it provides a way to initialize the inheriting object right after it is created.

## The problem with `class`

The modern `class` syntax actually has multiple problems, but there is one in particular that we aim to address with the function `deriveConstructor`.

When we `new` any regular function as a constructor, the `new` operator roughly behaves like the following function:

```js
function emulateNew(Constructor, ...args) {
    var instance = Object.create(Constructor.prototype);
    var result = Constructor.call(instance, ...args);
    if (result != null && typeof result === 'object') return result;
    return instance;
}
```

Because of this mechanism, where the instance is already created before the constructor runs, it is relatively straightforward to write a constructor that calls the constructor of a parent prototype. Before the `class` keyword entered the scene, everyone emulated class inheritance roughly as follows:

```js
// The base "class" that we will derive from.
// It may or may not have a custom prototype.
function Base(...args) {...}

// The constructor of the derived "class".
function Derived(...args) {
    // Call "super".
    Base.call(this, ...args);
    // Maybe do additional initialization.
    // Maybe return a special value.
}

// Set up the prototype chain.
Derived.prototype = Object.create(Base.prototype);
Derived.prototype.constructor = Derived;
```

There have been many implementations of the above pattern, such as Backbone's [`.extend`][bb-extend], but they were almost universally interchangeable. There was simply not much freedom in how classes could be emulated in JavaScript.

[bb-extend]: https://backbonejs.org/#Model-extend

This subtly but radically changed with the introduction of the `class` keyword. The following code is **not** equivalent to the above:

```js
class Base {}

class Derived extends Base {
    constructor(...args) {
        // Part before super. Not allowed to use `this` here.
        super(...args);
        // Part after super. Now allowed to dereference `this`.
    }
}
```

How is it different? The fact that we cannot use `this` before we call `super` already hints at it. Behind our back, the `Derived` constructor is transformed into a function that roughly behaves like this:

```js
function Derived(...args) {
    // Part before super. Not allowed to use `this` here.

    // Super call. A three-step process.
    // Step 1: temporarily replace Base's prototype by our own.
    // We create a backup of Base's prototype so we can restore it.
    var baseProto = Base.prototype;
    Base.prototype = Derived.prototype;
    // Step 2: create `this` by calling the Base constructor.
    // Note that assigning to `this` is not actually allowed in
    // reality, hence the `super` keyword.
    this = new Base(...args);
    // Step 3: restore Base's own prototype.
    Base.prototype = baseProto;

    // Part after super. Now allowed to dereference `this`.

    // Implicitly return `this` by default.
}
```

Suddenly, the responsibility to instantiate the prototype has moved from the `new` operator to the constructor itself. You may point out that the above pseudocode still involves `new`, but consider what conceptually happens at the end of the inheritance chain inside the `Object` constructor:

```js
// This is what Object might look like if it was not native
// (omitting the logic for object-wrapping primitive values).
function Object() {
    // Note: if this happens inside a super call, Object.prototype will
    // temporarily point to the prototype of a derived constructor.
    this = Object.create(Object.prototype);
}
```

With `super()`, we are indirectly just calling `Object.create` with our own prototype and then allowing all ancestor constructors to run their initialization logic. *All* of the logic that we previously wrote in `emulateNew` has moved into the constructor itself. The only reason we still use the `new` operator at all is because of tradition and because we are not allowed to omit it. Just because.

You may argue that the new `class` mechanism is better, because it ensures that a derived constructor cannot violate assumptions made by its ancestor constructors. To this I would counter that it is a limited win. While it is true that the derived constructor can no longer set unexpected instance properties, the derived *prototype* can still have properties that violate assumptions of the base constructor.

In trade for this slight upgrade in integrity, we lose interoperability. It is impossible to derive a plain constructor from a modern `class`:

```js
// Modern.
class Base {}

// Attempt 1, conventionally classic.
function Derived() {
    Base.call(this);
    // Error: not allowed to call class constructor without new.
}

// Attempt 2, imaginative semi-classic.
function Derived() {
    this = new Base();
    // Error: not allowed to assign to this.
}

// Attempt 3, really stretching it now.
function Derived() {
    super();
    // Error: not allowed to call super in non-class constructor.
}
```

Why is this a problem? Modern classes can still derive from classic ones, so surely, we can just stop writing classical constructors and move to modern `class` entirely? Unfortunately, it is not so simple.

The main problem is that we are not always in control. A project might depend on legacy code that attempts to dynamically derive classes using classic emulation. For example, I might be writing a Backbone application with two additional dependencies. The first dependency, `view-toolkit`, exports specialized view classes for common user interface elements such as buttons, dropdowns and tables. Those views are all derived from `Backbone.View` using modern `class` syntax. The second dependency, `view-decorators`, exports functions that take an arbitrary view class and return a derived class with a new ability added, such as showing a tooltip when hovered or supporting drag-and-drop. These functions all rely on `View.extend` for inheritance.  Due to the backwards incompatibility of the modern `class`, I cannot take a button view from `view-toolkit` and add a tooltip to it with `view-decorators`!

Adding to this, classic emulators such as `View.extend` sometimes have merits that make it attractive to continue using them. For example, it is much more convenient to set non-method properties on a prototype using Backbone's `.extend` than with with a modern `class`. Compare these two equivalent pieces of code:

```js
// Classic
var FormView = Backbone.View.extend({
    tagName: 'form',
    render() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
});

// Modern
class FormView extends Backbone.View {
    render() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
}
FormView.prototype.tagName = 'form';
```

Before you ask, the following variant is *not* equivalent:

```js
class FormView extends Backbone.View {
    tagName = 'form';
    render() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
}
```

because this sets the `tagName` on the instance instead of on the prototype. This semantic interferes with inheritance. This is one of the other problems with `class`, but I will restrain myself and stop here.

### Solution: `deriveConstructor`

The red cross in the following table summarizes the problem we want to solve:

| | derive plain constructor | derive `class` |
|---|---|---|
| plain constructor base | ✅ | ✅ |
| `class` base | ❌ | ✅ |

The `deriveConstructor` function provides an alternative form of class emulation that is compatible with both plain constructors and modern `class`es, in both directions. In other words, it can derive from both and both can derive from it. To achieve this nifty feat, it uses the relatively new [`Reflect.construct`][reflect-construct] under the hood.

[reflect-construct]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct

To use `deriveConstructor`, first imagine that you are writing a modern constructor that involves calling `super()`. Then, split that constructor in two parts: the part before `super` and the part after `super`. We will call these functions `prepare` and `initialize`, respectively.

`prepare` takes the same parameters as the constructor that you want to derive. It cannot access `this`; its only job is to prepare the arguments for `super`. It returns those arguments in an array.

`initialize` receives two arrays as arguments: the first array contains the arguments passed to `prepare` (and by extension, to your final constructor), while the second contains the arguments passed to `super` (i.e., the return value of `prepare`). It can access and modify `this`. It may return a special value, in which case that behavior is retained in your final constructor.

With these two functions defined, you finally run

```js
var Derived = deriveConstructor(Base, prepare, initialize);
```

where `Base` is the constructor or `class` you want to derive from and `Derived` is your super-compatible derived constructor. To illustrate, where you would previously write

```js
function Derived(...args) {
    var baseArgs = someTransformationOf(args);
    Base.call(this, ...baseArgs);
    doAnythingWith(this, args, baseArgs);
    return maybeSomethingBasedOn(this, args, baseArgs);
}
Derived.prototype = Object.create(Base.prototype);
Derived.prototype.constructor = Derived;
Object.setPrototypeOf(Derived, Base);
```

or

```js
var Derived = Base.extend({
    constructor(...args) {
        var baseArgs = someTransformationOf(args);
        Base.call(this, ...baseArgs);
        doAnythingWith(this, args, baseArgs);
        return maybeSomethingBasedOn(this, args, baseArgs);
    },
});
```

or

```js
class Derived extends Base {
    constructor(...args) {
        var baseArgs = someTransformationOf(args);
        super(...baseArgs);
        doAnythingWith(this, args, baseArgs);
        return maybeSomethingBasedOn(this, args, baseArgs);
    }
}
```

, you can now also do this:

```js
var Derived = deriveConstructor(Base,
    function prepare(...args) {
        return someTransformationOf(args);
    },
    function initialize(args, baseArgs) {
        doAnythingWith(this, args, baseArgs);
        return maybeSomethingBasedOn(this, args, baseArgs);
    }
);
```

with the advantage of complete compatibility. As an added bonus, it is up to you whether you want to call `Derived` with or without `new`; the result is the same.

## The problem with `super`

The `super` keyword is, frankly, not very useful. Of course, you *need* it inside the `constructor` of a `class` to call `super()`. However, its other purpose, to access a property of a parent prototype with the notation `super.property`, is less powerful than one might intuitively expect. Moreover, in many situations where it might seem useful, it is not available at all. We will illustrate this with a few examples.

This is allowed:

```js
var example = {
    someMethod() {
        return super.someMethod();
    },
};
```

but this is not:

```js
var example = {
    someMethod: function() {
        return super.someMethod();
    },
};
```

nor is this:

```js
function someMethod() {
    return super.someMethod();
}

var example = {someMethod};
```

In the following example, `b` inherits from `a` and `d` inherits from `c`. The `shout` method from `b` is mixed into `d`. Try to predict the return value of `d.shout()`.

```js
var a = {virtue: 'accessibility'};

var b = {
    virtue: 'beauty',
    shout() {
        return `${this.virtue} and ${super.virtue}!`;
    },
};

Object.setPrototypeOf(b, a);

var c = {virtue: 'credibility'};
var d = {virtue: 'dignity'};

Object.setPrototypeOf(d, c);
d.shout = b.shout;

d.shout();
```

The answer is `'dignity and accessibility!'`. The `this` keyword is dynamically scoped, so the first virtue is obtained from `d`. We may intuitively expect the same from `super`, in which case the second virtue would be obtained from `c`. However, `super` is actually *lexically* scoped, so the second virtue is obtained from `a` instead. We would get the same result if `a`, `b`, `c` and `d` were instances of classes with the same pattern of inheritance.

The last example will drive this point home:

```js
class A {}
A.prototype.virtue = 'accessibility';

class B extends A {
    shout() {
        return `${this.virtue} and ${super.virtue}!`;
    }
}
B.prototype.virtue = 'beauty';

class C extends B {}
C.prototype.virtue = 'credibility';

var c = new C;
c.shout(); // 'credibility and accessibility!'
```

Superficially, it may seem reasonable that `super.virtue` always refers to `A.prototype.virtue`, because it appears in the body of the `B` class, which derives from `A`. However, this is different from the semantics of `this`; we do not expect `this.virtue` to always refer to `B.prototype.virtue`. Moreover, the keyword `super` does not really enable us to do anything new in this way; we could just write `A.prototype` instead.

### Solution: `parent`

The `parent` function redeems all of the missed opportunities of the `super` keyword. The expression `parent(this).property` does what one would *intuitively* expect of `super.property`, including in situations where the latter notation is not even available. It also behaves intuitively when values other than `this` are passed as its argument. For illustration, we will revisit the previous examples.

The following three notations are all allowed and equivalent:

```js
var example = {
    someMethod() {
        return parent(this).someMethod();
    },
};

var example = {
    someMethod: function() {
        return parent(this).someMethod();
    },
};

function someMethod() {
    return parent(this).someMethod();
}
var example = {someMethod};
```

In the following example, the final expression `d.shout()` returns `'dignity and credibility!'`:

```js
var a = {virtue: 'accessibility'};

var b = {
    virtue: 'beauty',
    shout() {
        return `${this.virtue} and ${parent(this).virtue}!`;
    },
};

Object.setPrototypeOf(b, a);

var c = {virtue: 'credibility'};
var d = {virtue: 'dignity'};

Object.setPrototypeOf(d, c);
d.shout = b.shout;

d.shout();
```

In addition, `parent(b)` returns `a` and `parent(d)` returns `c`.

In the following example, the final expression `c.shout()` returns `'credibility and beauty!'`. Also, `parent(C)` returns `B`, `parent(C.prototype)` returns `B.prototype` and `parent(c).virtue` returns `'beauty'`. You could even do `new parent(parent(C))()` in order to obtain a new instance of `A`.

```js
class A {}
A.prototype.virtue = 'accessibility';

class B extends A {
    shout() {
        return `${this.virtue} and ${parent(this).virtue}!`;
    }
}
B.prototype.virtue = 'beauty';

class C extends B {}
C.prototype.virtue = 'credibility';

var c = new C;
c.shout(); // 'credibility and accessibility!'
```
