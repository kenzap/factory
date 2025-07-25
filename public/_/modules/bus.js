// bus.js
class Bus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} cb - Callback function
     */
    on(event, cb) {

        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(cb);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} cb - Callback function to remove
     */
    off(event, cb) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(fn => fn !== cb);
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} payload - Data to send to listeners
     */
    emit(event, payload) {
        if (!this.events[event]) return;
        this.events[event].forEach(cb => cb(payload));
    }

    /**
     * Clear all listeners for an event
     * @param {string} event - Event name
     */
    clear(event) {
        if (this.events[event]) {
            delete this.events[event];
        }
    }
}

// Export a singleton instance
export const bus = new Bus();