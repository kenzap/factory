// Base Component Class
export class Component {
    constructor(element) {
        this.element = element;
        this.listeners = new Map();
    }

    render() {
        throw new Error('render() must be implemented');
    }

    destroy() {
        this.listeners.forEach((listener, element) => {
            element.removeEventListener(listener.event, listener.handler);
        });
        this.listeners.clear();
    }

    addListener(selector, event, handler) {
        const elements = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : [selector];

        elements.forEach(element => {
            element.addEventListener(event, handler);
            this.listeners.set(element, { event, handler });
        });
    }
}