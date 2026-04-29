import { getAuthToken } from "../../helpers/auth.js";

export class SSEService {
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

        this.init();
    }

    init() {

        const token = getAuthToken(); // Get your auth token

        if (!token) {
            console.warn('No auth token, skipping SSE connection');
            return;
        }

        this.connectWithPost(token)
    }

    /**
     * Connect using POST request (more secure - token in body)
     */
    async connectWithPost(token) {
        if (this.isConnected) return;
        if (this.connectionPromise) return this.connectionPromise;

        this.shouldReconnect = true;

        this.connectionPromise = (async () => {
            try {
                this.abortController = new AbortController();

                const response = await fetch('/api/manufacturing-updates/connect', {
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

                console.log('SSE connection response:', response);

                if (!response.ok) {
                    throw new Error('Failed to connect to manufacturing updates');
                }

                if (!response.body) {
                    throw new Error('Manufacturing updates stream body is not available');
                }

                this.reader = response.body.getReader();
                this.setupEventStream(this.reader, token);
                this.isConnected = true;
                this.reconnectAttempts = 0;

            } catch (error) {
                if (error?.name === 'AbortError' || !this.shouldReconnect) return;
                console.error('SSE connection error:', error);
                this.attemptReconnect(token);
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    /**
     * Setup stream reader for POST-based connection
     */
    setupEventStream(reader, token) {
        const decoder = new TextDecoder();
        let buffer = '';

        const readStream = () => {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('Stream closed');
                    this.isConnected = false;
                    this.reader = null;
                    if (this.shouldReconnect) this.attemptReconnect(token);
                    return;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        this.handleMessage(data);
                    }
                });

                readStream();
            }).catch(error => {
                if (error?.name === 'AbortError' || !this.shouldReconnect) {
                    this.reader = null;
                    return;
                }

                console.error('Stream read error:', error);
                this.isConnected = false;
                this.reader = null;
                this.attemptReconnect(token);
            });
        };

        readStream();
    }

    /**
     * Handle incoming SSE message
     */
    handleMessage(data) {
        try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'connected') {
                console.log('Manufacturing updates connected:', parsed.message);
                return;
            }

            // Notify all listeners
            this.listeners.forEach(callback => {
                try {
                    callback(parsed);
                } catch (error) {
                    console.error('Error in listener:', error);
                }
            });

        } catch (error) {
            console.error('Error parsing SSE message:', error);
        }
    }

    // handleUpdates(data) {
    //     console.log('Received SSE update:', data);

    //     // Handle different types of updates
    //     switch (data.type) {
    //         case 'items-update':
    //             this.handleItemsUpdate(data);
    //             break;
    //         case 'stock-update':
    //             // this.handleStockUpdate(data);
    //             break;
    //         default:
    //             console.log('Unhandled update type:', data.type);
    //     }
    // }

    /**
     * Subscribe to stock updates
     */
    subscribe(callback) {
        this.listeners.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Attempt reconnection with exponential backoff
     */
    attemptReconnect(token) {
        if (!this.shouldReconnect) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            this.connectWithPost(token);
        }, delay);
    }

    /**
     * Disconnect from SSE
     */
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

// Export singleton
// export const stockSSE = new StockSSEService();
