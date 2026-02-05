/**
 * Manages Server-Sent Events (SSE) connections and broadcasting.
 * Handles multiple client connections and provides methods to add, remove,
 * and broadcast messages to all connected clients.
 */
class SSEManager {
    constructor() {
        this.clients = new Map();
    }

    addClient(client, metadata = {}) {
        this.clients.set(client, {
            connectedAt: new Date(),
            userId: metadata.userId,
            username: metadata.username
        });
        console.log(`SSE client connected. Total: ${this.clients.size}`);
    }

    removeClient(client) {
        this.clients.delete(client);
        console.log(`SSE client disconnected. Total: ${this.clients.size}`);
    }

    broadcast(data) {
        const message = `data: ${JSON.stringify(data)}\n\n`;

        this.clients.forEach((metadata, client) => {
            try {
                client.write(message);
            } catch (error) {
                console.error('Error sending SSE:', error);
                this.removeClient(client);
            }
        });
    }

    getClientCount() {
        return this.clients.size;
    }
}

export const sseManager = new SSEManager();