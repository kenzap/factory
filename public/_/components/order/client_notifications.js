import { __html, onChange, onClick } from "../../helpers/global.js";

/**
 * ClientNotifications component to manage notifications settings for clients.
 * 
 * @class ClientNotifications
 */
export class ClientNotifications {

    constructor(client) {
        this.client = client;

        // Initialize notifications structure if it doesn't exist
        this.client.notifications = this.client.notifications || (this.client._id ?
            {
                order_received: { email: false, whatsapp: false },
                order_confirmed: { email: false, whatsapp: false },
                order_ready: { email: false, whatsapp: false },
                order_cancelled: { email: false, whatsapp: false },
                payment_received: { email: false, whatsapp: false },
                promotions: { email: false, whatsapp: false },
                ask_feedback: { email: false, whatsapp: false }
            }
            :
            {
                order_received: { email: true, whatsapp: true },
                order_confirmed: { email: true, whatsapp: true },
                order_ready: { email: true, whatsapp: true },
                order_cancelled: { email: false, whatsapp: false },
                payment_received: { email: false, whatsapp: false },
                promotions: { email: false, whatsapp: false },
                ask_feedback: { email: true, whatsapp: false }
            })
            ;

        this.notificationTypes = [
            { key: 'order_received', label: __html('Order Received'), icon: 'bi-inbox' },
            { key: 'order_confirmed', label: __html('Order Confirmed'), icon: 'bi-clipboard-check' },
            { key: 'order_ready', label: __html('Order Ready'), icon: 'bi-check-circle' },
            { key: 'order_cancelled', label: __html('Order Cancelled'), icon: 'bi-x-circle' },
            { key: 'payment_received', label: __html('Payment Received'), icon: 'bi-credit-card' },
            { key: 'promotions', label: __html('Promotions & Offers'), icon: 'bi-gift' },
            { key: 'ask_feedback', label: __html('Ask Feedback'), icon: 'bi-chat-heart' }
        ];

        this.channels = [
            { key: 'email', label: __html('Email'), icon: 'bi-envelope' },
            { key: 'whatsapp', label: __html('WhatsApp'), icon: 'bi-whatsapp' }
        ];

        this.init();
    }

    init = () => {
        this.view();
        this.refreshNotifications();
        this.listeners();
    }

    view = () => {
        document.querySelector('client-notifications').innerHTML = `
            <div class="mb-5">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="bi bi-bell me-2"></i>${__html('Notification settings')}</h5>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btnEnableAll">
                            <i class="bi bi-check-all me-1"></i>${__html('Enable all')}
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btnDisableAll">
                            <i class="bi bi-x-lg me-1 d-none"></i>${__html('Disable all')}
                        </button>
                    </div>
                </div>
                
                <div id="notificationsList">
                    <!-- Notification items will be dynamically added here -->
                </div>
            </div>
        `;
    }

    refreshNotifications = () => {
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';

        this.notificationTypes.forEach((notificationType) => {
            const notification = this.client.notifications[notificationType.key] || {};

            notificationsList.insertAdjacentHTML('beforeend', /*html*/`
            <div class="notification-item border-bottom rounded-0 bg-white p-3 px-1" data-notification-type="${notificationType.key}">
                <div class="d-flex align-items-center mb-2">
                    <i class="${notificationType.icon} me-2 text-primary-"></i>
                    <h6 class="mb-0 fw-semibold">${__html(notificationType.label)}</h6>
                </div>
                <div class="row">
                    ${this.channels.map(channel => `
                        <div class="col-md-6 col-sm-6 mb-0">
                            <div class="form-check form-switch">
                                <input class="form-check-input notification-toggle" 
                                       type="checkbox" 
                                       role="switch"
                                       id="${notificationType.key}_${channel.key}"
                                       data-notification-type="${notificationType.key}"
                                       data-channel="${channel.key}"
                                       ${notification[channel.key] ? 'checked' : ''}>
                                <label class="form-check-label" for="${notificationType.key}_${channel.key}">
                                    <i class="${channel.icon} me-1"></i>${__html(channel.label)}
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            `);
        });
    }

    updateNotification = (notificationType, channel, enabled) => {
        if (!this.client.notifications[notificationType]) {
            this.client.notifications[notificationType] = {};
        }
        this.client.notifications[notificationType][channel] = enabled;

        console.log(`Updated notification: ${notificationType}.${channel} = ${enabled}`);
    }

    enableAllNotifications = () => {
        this.notificationTypes.forEach(notificationType => {
            this.channels.forEach(channel => {
                this.client.notifications[notificationType.key][channel.key] = true;
            });
        });
        this.refreshNotifications();
    }

    disableAllNotifications = () => {
        this.notificationTypes.forEach(notificationType => {
            this.channels.forEach(channel => {
                this.client.notifications[notificationType.key][channel.key] = false;
            });
        });
        this.refreshNotifications();
    }

    getNotificationSettings = () => {
        return this.client.notifications;
    }

    isNotificationEnabled = (notificationType, channel) => {
        return this.client.notifications[notificationType]?.[channel] || false;
    }

    listeners = () => {
        // Toggle notification settings
        onChange('.notification-toggle', (e) => {
            const notificationType = e.currentTarget.dataset.notificationType;
            const channel = e.currentTarget.dataset.channel;
            const enabled = e.currentTarget.checked;

            this.updateNotification(notificationType, channel, enabled);
        });

        // Enable all notifications
        onClick('#btnEnableAll', () => {
            this.enableAllNotifications();
        });

        // Disable all notifications
        onClick('#btnDisableAll', () => {
            this.disableAllNotifications();
        });
    }
}
