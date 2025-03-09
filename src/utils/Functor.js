export class Functor {
    constructor(value) {
        this.value = value;
    }

    map(fn) {
        return new Functor(fn(this.value));
    }

    async mapAsync(fn) {
        const newValue = await fn(this.value);
        return new Functor(newValue);
    }

    getValue() {
        return this.value;
    }
}