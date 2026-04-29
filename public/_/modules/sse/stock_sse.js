class StockSSEService {
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

                const response = await fetch('/api/stock-updates/connect', {
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
                    throw new Error('Failed to connect to stock updates');
                }

                if (!response.body) {
                    throw new Error('Stock updates stream body is not available');
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
     * Traditional GET connection (token in header or URL)
     */
    connectWithGet(token) {
        if (this.isConnected) return;

        // Note: EventSource doesn't support custom headers in standard browsers
        // So we need to pass token as query param or use polyfill
        this.eventSource = new EventSource(`/api/stock-updates/stream`, {
            withCredentials: true
        });

        this.eventSource.onopen = () => {
            console.log('SSE connection opened');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        };

        this.eventSource.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            this.isConnected = false;
            this.eventSource.close();
            this.attemptReconnect(token);
        };
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
                console.log('Stock updates connected:', parsed.message);
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
export const stockSSE = new StockSSEService();
