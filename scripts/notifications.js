class NotificationSystem {
    constructor() {
        this.container = null;
        this.maxNotifications = 3;
        this.notificationsQueue = [];
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        this.container.innerHTML = `
            <style>
                @keyframes slideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(120%); opacity: 0; }
                }
                .notifications-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-width: 380px;
                    pointer-events: none;
                }
                .notification {
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
                    animation: slideIn 0.3s ease forwards;
                    pointer-events: auto;
                    position: relative;
                    min-width: 280px;
                    transform: translateX(120%);
                    opacity: 0;
                }
                .notification.show {
                    transform: translateX(0);
                    opacity: 1;
                }
                .notification.hide {
                    animation: slideOut 0.3s ease forwards !important;
                }
                .notification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                }
                .notification-title {
                    font-weight: 700;
                    font-size: 14px;
                    margin: 0;
                }
                .notification-message {
                    font-size: 14px;
                    line-height: 1.5;
                    margin: 0;
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    line-height: 1;
                    padding: 2px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    margin-top: -4px;
                }
                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                .notification--success {
                    background: linear-gradient(135deg, #1a5632 0%, #1e6538 100%);
                    border-left: 4px solid #34c759;
                }
                .notification--success .notification-title { color: #34c759; }
                .notification--success .notification-message { color: #e0f0e9; }
                .notification--success .notification-close { color: #a0e5b5; }
                
                .notification--error {
                    background: linear-gradient(135deg, #561a1a 0%, #651e1e 100%);
                    border-left: 4px solid #ff4d4f;
                }
                .notification--error .notification-title { color: #ff4d4f; }
                .notification--error .notification-message { color: #ffe0e0; }
                .notification--error .notification-close { color: #ffb3b3; }
                
                .notification--warning {
                    background: linear-gradient(135deg, #564a1a 0%, #65581e 100%);
                    border-left: 4px solid #ffc107;
                }
                .notification--warning .notification-title { color: #ffc107; }
                .notification--warning .notification-message { color: #fff8e1; }
                .notification--warning .notification-close { color: #ffdf9e; }
                
                .notification--info {
                    background: linear-gradient(135deg, #1a3d56 0%, #1e4a65 100%);
                    border-left: 4px solid #4da6ff;
                }
                .notification--info .notification-title { color: #4da6ff; }
                .notification--info .notification-message { color: #e1f0ff; }
                .notification--info .notification-close { color: #a8d0ff; }
            </style>
        `;
        document.body.appendChild(this.container);
    }

    show(options) {
        const {
            title = 'Уведомление',
            message,
            type = 'info',
            duration = 5000,
            actions = []
        } = options;

        while (this.notificationsQueue.length >= this.maxNotifications) {
            this.hide(this.notificationsQueue.shift());
        }

        const notification = this.createNotification({ title, message, type, actions });
        this.notificationsQueue.push(notification);
        this.container.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        if (duration > 0) {
            const timeoutId = setTimeout(() => {
                this.hide(notification);
            }, duration);

            notification.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
            });

            notification.addEventListener('mouseleave', () => {
                const newTimeout = setTimeout(() => {
                    this.hide(notification);
                }, 2000);
                notification._timeoutId = newTimeout;
            });
        }

        return notification;
    }

    createNotification({ title, message, type }) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <h4 class="notification-title">${title}</h4>
                <button class="notification-close" aria-label="Закрыть">×</button>
            </div>
            <p class="notification-message">${message}</p>
        `;

        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.hide(notification);
        });

        return notification;
    }

    hide(notification) {
        const index = this.notificationsQueue.indexOf(notification);
        if (index > -1) {
            this.notificationsQueue.splice(index, 1);
        }

        if (notification._timeoutId) {
            clearTimeout(notification._timeoutId);
        }

        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    success(message, title = 'Успешно!') {
        return this.show({ title, message, type: 'success', duration: 3500 });
    }

    error(message, title = 'Ошибка') {
        return this.show({ title, message, type: 'error', duration: 5000 });
    }

    warning(message, title = 'Внимание') {
        return this.show({ title, message, type: 'warning', duration: 4500 });
    }

    info(message, title = 'Информация') {
        return this.show({ title, message, type: 'info', duration: 4000 });
    }
}

window.notifications = new NotificationSystem();