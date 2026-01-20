import { EventEmitter } from 'events'

/**
 * Retrieves the allowed events from a manifest object.
 * 
 * @param {Object} manifest - The manifest object containing event configuration
 * @param {Array} [manifest.events] - Optional array of allowed events
 * @returns {Array} An array of allowed events, or an empty array if no events are defined
 */
export const getAllowedEvents = (manifest) => {

    return Array.isArray(manifest.events)
        ? manifest.events
        : []
}

/**
 * Checks if an event is allowed based on a list of allowed event patterns.
 * 
 * @param {string} event - The event name to check
 * @param {string[]} allowedEvents - Array of allowed event patterns. Patterns can be:
 *   - Exact event names (e.g., "user.login")
 *   - Wildcard patterns ending with ".*" (e.g., "user.*" matches "user.login", "user.logout", etc.)
 * @returns {boolean} True if the event matches any of the allowed patterns, false otherwise
 * 
 * @example
 * // Exact match
 * isEventAllowed('user.login', ['user.login', 'admin.create']) // returns true
 * 
 * @example
 * // Wildcard match
 * isEventAllowed('user.logout', ['user.*', 'admin.create']) // returns true
 * 
 * @example
 * // No match
 * isEventAllowed('system.shutdown', ['user.*', 'admin.create']) // returns false
 */
export const isEventAllowed = (event, allowedEvents) => {
    return allowedEvents.some(pattern => {
        if (pattern === event) return true

        if (pattern.endsWith('.*')) {
            return event.startsWith(pattern.slice(0, -2))
        }

        return false
    })
}

/**
 * Creates an event interface for a specific integration that wraps the event bus functionality.
 * 
 * @param {Object} eventBus - The event bus instance to wrap
 * @param {string} integrationName - The name of the integration that will use this interface
 * @returns {Object} An object with event handling methods scoped to the integration
 * @returns {Function} returns.on - Method to register event handlers with integration context
 */
export const createEventInterface = (eventBus, integrationName) => {
    return {
        on(event, handler) {
            eventBus.on(event, handler, { integration: integrationName })
        }
    }
}

/**
 * EventBus class that wraps Node.js EventEmitter with enhanced error handling and metadata support.
 * Provides a simple interface for event-driven communication with automatic error catching.
 * 
 * @class EventBus
 * @example
 * const eventBus = new EventBus();
 * eventBus.on('user:login', async (userData) => {
 *   console.log('User logged in:', userData);
 * }, { integration: 'auth' });
 * eventBus.emit('user:login', { id: 1, name: 'John' });
 */
class EventBus {
    constructor() {
        this.emitter = new EventEmitter()
        this.emitter.setMaxListeners(100)
    }

    on(event, handler, meta = {}) {
        this.emitter.on(event, async (...args) => {
            try {
                await handler(...args)
            } catch (err) {
                console.error(
                    `[system][error] ${event} (${meta.integration ?? 'core'})`,
                    err
                )
            }
        })
    }

    emit(event, ...args) {
        this.emitter.emit(event, ...args)
    }
}

export const eventBus = new EventBus()