// ============================================
// PWA Manager - Offline podpora a instalace
// ============================================

export class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isOnline = navigator.onLine;
        this.installButton = null;
    }

    async init() {
        // Registrace Service Workeru
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker registrován:', registration.scope);

                // Kontrola aktualizací
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('❌ Service Worker registrace selhala:', error);
            }
        }

        // Zachycení install promptu
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        // Detekce instalace
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            console.log('✅ Aplikace nainstalována');
            this.hideInstallButton();

            // Analytics
            this.trackEvent('pwa_installed');
        });

        // Online/Offline detekce
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));

        // Sledování stavu sítě
        this.monitorConnection();
    }

    async installApp() {
        if (!this.deferredPrompt) {
            console.log('❌ Instalační prompt není dostupný');
            this.showManualInstallInstructions();
            return;
        }

        try {
            const result = await this.deferredPrompt.prompt();
            console.log('📱 Uživatel reagoval na instalaci:', result.outcome);

            this.deferredPrompt = null;
            this.hideInstallButton();

            return result;
        } catch (error) {
            console.error('❌ Instalace selhala:', error);
        }
    }

    showInstallButton() {
        // Vytvoření instalačního tlačítka v UI
        const button = document.createElement('button');
        button.id = 'pwa-install-button';
        button.innerHTML = '📱 Nainstalovat aplikaci';
        button.className = 'pwa-install-btn';
        button.onclick = () => this.installApp();

        document.body.appendChild(button);
        this.installButton = button;

        // Animace zobrazení
        setTimeout(() => {
            button.classList.add('visible');
        }, 2000);
    }

    hideInstallButton() {
        if (this.installButton) {
            this.installButton.classList.remove('visible');
            setTimeout(() => {
                this.installButton?.remove();
                this.installButton = null;
            }, 500);
        }
    }

    showManualInstallInstructions() {
        // Instrukce pro manuální instalaci
        const platform = this.detectPlatform();
        let instructions = '';

        switch (platform) {
            case 'android':
                instructions = 'Otevřete menu prohlížeče → "Přidat na plochu"';
                break;
            case 'ios':
                instructions = 'Klikněte na tlačítko Sdílet → "Přidat na plochu"';
                break;
            case 'desktop':
                instructions = 'Klikněte na ikonu instalace v adresním řádku';
                break;
        }

        // Zobrazení instrukcí v UI
        this.showToast(instructions);
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/i.test(ua)) return 'android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
        return 'desktop';
    }

    handleOnlineStatus(isOnline) {
        this.isOnline = isOnline;

        if (isOnline) {
            this.showToast('🌐 Připojení obnoveno - data se synchronizují');
            this.syncOfflineData();
        } else {
            this.showToast('📡 Jste offline - hra pokračuje v offline režimu');
        }
    }

    async syncOfflineData() {
        // Synchronizace offline dat s cloudem
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            try {
                await registration.sync.register('sync-game-data');
                console.log('🔄 Synchronizace naplánována');
            } catch (error) {
                console.error('❌ Synchronizace selhala:', error);
            }
        }
    }

    monitorConnection() {
        if ('connection' in navigator) {
            const connection = navigator.connection;

            const updateConnectionInfo = () => {
                console.log('📶 Stav připojení:', {
                    type: connection.type,
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt
                });

                // Přizpůsobení kvality grafiky podle připojení
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    this.reduceGraphicsQuality('low');
                } else if (connection.effectiveType === '3g') {
                    this.reduceGraphicsQuality('medium');
                }
            };

            connection.addEventListener('change', updateConnectionInfo);
            updateConnectionInfo();
        }
    }

    reduceGraphicsQuality(quality) {
        // Redukce grafických efektů pro slabší připojení
        if (window.GAME_INSTANCE?.game) {
            const game = window.GAME_INSTANCE.game;

            switch (quality) {
                case 'low':
                    game.renderer.setPostPipeline('BloomFX', { uIntensity: 0.3 });
                    break;
                case 'medium':
                    game.renderer.setPostPipeline('BloomFX', { uIntensity: 0.7 });
                    break;
                default:
                    game.renderer.setPostPipeline('BloomFX', { uIntensity: 1.5 });
            }
        }
    }

    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'pwa-toast';
        toast.textContent = message;

        document.body.appendChild(toast);

        // Animace
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Automatické skrytí
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    trackEvent(eventName, data = {}) {
        // Analytics pro PWA události
        if (window.gtag) {
            window.gtag('event', eventName, {
                ...data,
                platform: this.detectPlatform(),
                installed: this.isInstalled
            });
        }
    }
}
