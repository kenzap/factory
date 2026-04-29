import { getAuthToken } from "../../helpers/auth.js";

class OrderUpdatesSSEService {
    constructor() {
        this.eventSource = null;
        this.reader = null;
        this.abortController = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.reconnectTimeout = null;
        this.listeners = [];
        this.isConnected = false;
        this.connectionPromise = null;
        this.shouldReconnect = true;
    }

    connect() {
        const token = getAuthToken();

        if (!token) {
            console.warn('No auth token, skipping order updates connection');
            return Promise.resolve();
        }

        if (this.isConnected) return Promise.resolve();
        if (this.connectionPromise) return this.connectionPromise;

        this.shouldReconnect = true;

        this.connectionPromise = this.connectWithPost(token).finally(() => {
            this.connectionPromise = null;
        });

        return this.connectionPromise;
    }

    async connectWithPost(token) {
        if (this.isConnected) return;

        try {
            this.abortController = new AbortController();

            const response = await fetch('/api/order-updates/connect', {
                method: 'POST',
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error('Failed to connect to order updates');
            }

            if (!response.body) {
                throw new Error('Order updates stream body is not available');
            }

            this.reader = response.body.getReader();
            this.setupEventStream(this.reader, token);
            this.isConnected = true;
            this.reconnectAttempts = 0;
        } catch (error) {
            if (error?.name === 'AbortError' || !this.shouldReconnect) return;
            console.error('Order SSE connection error:', error);
            this.attemptReconnect(token);
        }
    }

    setupEventStream(reader, token) {
        const decoder = new TextDecoder();
        let buffer = '';

        const readStream = () => {
            reader.read().then(({ done, value }) => {
                if (done) {
                    this.isConnected = false;
                    this.reader = null;
                    if (this.shouldReconnect) this.attemptReconnect(token);
                    return;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                lines.forEach((line) => {
                    if (line.startsWith('data: ')) {
                        this.handleMessage(line.slice(6));
                    }
                });

                readStream();
            }).catch((error) => {
                if (error?.name === 'AbortError' || !this.shouldReconnect) {
                    this.reader = null;
                    return;
                }

                console.error('Order SSE stream read error:', error);
                this.isConnected = false;
                this.reader = null;
                this.attemptReconnect(token);
            });
        };

        readStream();
    }

    handleMessage(data) {
        try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'connected') {
                console.log('Order updates connected:', parsed.message, parsed.clientCount);
                return;
            }

            this.listeners.forEach((callback) => {
                try {
                    callback(parsed);
                } catch (error) {
                    console.error('Error in order SSE listener:', error);
                }
            });
        } catch (error) {
            console.error('Error parsing order SSE message:', error);
        }
    }

    subscribe(callback) {
        this.listeners.push(callback);

        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    attemptReconnect(token) {
        if (!this.shouldReconnect) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max order SSE reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            this.connectWithPost(token);
        }, delay);
    }

    disconnect() {
        this.shouldReconnect = false;
        this.isConnected = false;
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;

        if (this.reader) {
            this.reader.cancel().catch(() => { });
            this.reader = null;
        }

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        this.connectionPromise = null;
        this.listeners = [];
    }
}

export const orderUpdatesSSE = new OrderUpdatesSSEService();
