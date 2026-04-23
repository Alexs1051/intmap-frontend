import QrScanner from "qr-scanner";
import { Logger } from "@core/logger/logger";
import { Marker } from "@features/markers/marker";
import { IMarkerDetailsPanel, IMarkerManager, IPopupManager } from "@shared/interfaces";

export class UIManagerQrScanner {
  private qrScannerOverlay: HTMLDivElement | null = null;
  private qrScannerVideo: HTMLVideoElement | null = null;
  private qrScannerStatus: HTMLDivElement | null = null;
  private qrScannerInstance: QrScanner | null = null;
  private qrScannerResolve: ((value: string | null) => void) | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly getPopupManager: () => IPopupManager | undefined
  ) {}

  public async scanQrCode(markerManager: IMarkerManager | undefined, markerDetailsPanel: IMarkerDetailsPanel | undefined): Promise<void> {
    if (!markerManager) {
      return;
    }

    const scannedText = await this.openLiveQrScanner();
    if (!scannedText) {
      return;
    }

    const normalized = scannedText.trim();
    const marker = markerManager.getAllMarkers().find((item) => {
      if (!item.hasQR()) return false;
      const markerQr = item.getQR();
      return typeof markerQr === 'string' && markerQr.trim() === normalized;
    });

    if (!marker) {
      this.getPopupManager()?.warning('QR-код считан, но подходящая метка не найдена.');
      return;
    }

    markerManager.setSelectedMarker(marker);
    markerDetailsPanel?.show(marker as Marker);
    await markerManager.focusOnMarker(marker.id, { distance: 8, duration: 1.2 });
    this.getPopupManager()?.success(`Найдена метка: ${marker.name}`);
  }

  public dispose(): void {
    this.closeQrScanner(null);
    this.qrScannerOverlay?.remove();
    this.qrScannerOverlay = null;
    this.qrScannerVideo = null;
    this.qrScannerStatus = null;
    this.qrScannerInstance = null;
  }

  private ensureQrScannerOverlay(): void {
    if (this.qrScannerOverlay && this.qrScannerVideo && this.qrScannerStatus) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'qr-scanner-overlay ui-modal-overlay';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeQrScanner(null);
      }
    });

    const surface = document.createElement('div');
    surface.className = 'qr-scanner-surface ui-modal-surface';

    const header = document.createElement('div');
    header.className = 'qr-scanner-header';

    const title = document.createElement('div');
    title.className = 'qr-scanner-title';
    title.textContent = 'Сканирование QR-кода';

    const closeButton = document.createElement('button');
    closeButton.className = 'qr-scanner-close';
    closeButton.type = 'button';
    closeButton.textContent = '✕';
    closeButton.addEventListener('click', () => this.closeQrScanner(null));

    header.appendChild(title);
    header.appendChild(closeButton);

    const viewport = document.createElement('div');
    viewport.className = 'qr-scanner-viewport';

    const video = document.createElement('video');
    video.className = 'qr-scanner-video';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    const frame = document.createElement('div');
    frame.className = 'qr-scanner-frame';

    const status = document.createElement('div');
    status.className = 'qr-scanner-status';
    status.textContent = 'Наведите камеру на QR-код';

    viewport.appendChild(video);
    viewport.appendChild(frame);
    surface.appendChild(header);
    surface.appendChild(viewport);
    surface.appendChild(status);
    overlay.appendChild(surface);
    document.body.appendChild(overlay);

    this.qrScannerOverlay = overlay;
    this.qrScannerVideo = video;
    this.qrScannerStatus = status;
  }

  private async openLiveQrScanner(): Promise<string | null> {
    if (this.qrScannerResolve) {
      return null;
    }

    this.ensureQrScannerOverlay();

    return new Promise(async (resolve) => {
      this.qrScannerResolve = resolve;

      if (!this.qrScannerOverlay || !this.qrScannerVideo || !this.qrScannerStatus) {
        this.qrScannerResolve = null;
        resolve(null);
        return;
      }

      const capabilities = this.getQrScannerCapabilities();
      this.logger.info('QR scanner capabilities', capabilities);
      this.qrScannerStatus.textContent = 'Наведите камеру на QR-код';
      this.qrScannerOverlay.classList.add('visible');

      try {
        if (!(navigator.mediaDevices?.getUserMedia)) {
          this.logger.warn('QR scanner getUserMedia is unavailable', capabilities);
          this.qrScannerStatus.textContent = this.getQrScannerUnsupportedMessage(capabilities);
          const fallbackResult = await this.captureQrFromCameraFallback();
          this.closeQrScanner(fallbackResult);
          return;
        }

        this.qrScannerInstance?.destroy();
        this.qrScannerInstance = new QrScanner(
          this.qrScannerVideo,
          (result) => {
            const decoded = typeof result === 'string' ? result : result.data;
            if (this.qrScannerStatus) {
              this.qrScannerStatus.textContent = 'QR-код распознан';
            }
            this.closeQrScanner(decoded.trim());
          },
          {
            preferredCamera: 'environment',
            maxScansPerSecond: 12,
            returnDetailedScanResult: true,
            onDecodeError: (error) => {
              const message = error instanceof Error ? error.message : String(error);
              if (message !== QrScanner.NO_QR_CODE_FOUND) {
                this.logger.debug('QR scanner decode warning', message);
              }
            }
          }
        );

        await this.qrScannerInstance.start();
        this.qrScannerStatus.textContent = capabilities.barcodeDetector
          ? 'Наведите камеру на QR-код'
          : 'Камера запущена. Ищу QR-код через fallback-движок.';
      } catch (error) {
        this.logger.error('Unable to open QR scanner camera', error);
        const capabilitiesMessage = this.getQrScannerUnsupportedMessage(this.getQrScannerCapabilities(), error);
        if (this.qrScannerStatus) {
          this.qrScannerStatus.textContent = capabilitiesMessage;
        }
        this.getPopupManager()?.error(capabilitiesMessage);
        this.closeQrScanner(null);
      }
    });
  }

  private closeQrScanner(result: string | null): void {
    this.qrScannerInstance?.stop();
    this.qrScannerInstance?.destroy();
    this.qrScannerInstance = null;

    if (this.qrScannerVideo) {
      this.qrScannerVideo.pause();
      this.qrScannerVideo.srcObject = null;
    }

    if (this.qrScannerOverlay) {
      this.qrScannerOverlay.classList.remove('visible');
    }

    const resolve = this.qrScannerResolve;
    this.qrScannerResolve = null;
    resolve?.(result);
  }

  private captureQrFromCameraFallback(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';

      const cleanup = () => {
        input.remove();
      };

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) {
          cleanup();
          resolve(null);
          return;
        }

        try {
          const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
          if (typeof result?.data === 'string' && result.data.trim()) {
            resolve(result.data.trim());
          } else {
            this.getPopupManager()?.warning('QR-код не распознан. Попробуйте ещё раз.');
            resolve(null);
          }
        } catch (error) {
          this.logger.error('QR scan failed', error);
          this.getPopupManager()?.error('Не удалось обработать изображение с камеры.');
          resolve(null);
        } finally {
          cleanup();
        }
      }, { once: true });

      document.body.appendChild(input);
      input.click();
    });
  }

  private getQrScannerCapabilities(): {
    secureContext: boolean;
    mediaDevices: boolean;
    getUserMedia: boolean;
    barcodeDetector: boolean;
    userAgent: string;
  } {
    const mediaDevicesSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
    const getUserMediaSupported = mediaDevicesSupported && typeof navigator.mediaDevices.getUserMedia === 'function';

    return {
      secureContext: window.isSecureContext,
      mediaDevices: mediaDevicesSupported,
      getUserMedia: getUserMediaSupported,
      barcodeDetector: typeof (window as any).BarcodeDetector === 'function',
      userAgent: navigator.userAgent
    };
  }

  private getQrScannerUnsupportedMessage(
    capabilities: {
      secureContext: boolean;
      mediaDevices: boolean;
      getUserMedia: boolean;
      barcodeDetector: boolean;
    },
    error?: unknown
  ): string {
    if (!capabilities.secureContext) {
      return 'Камера в этом браузере доступна только по HTTPS или localhost. Сейчас страница открыта в небезопасном контексте.';
    }

    if (!capabilities.mediaDevices || !capabilities.getUserMedia) {
      return 'Текущий браузер не даёт сайту доступ к камере через getUserMedia.';
    }

    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return 'Доступ к камере запрещён. Разрешите доступ к камере для этого сайта в настройках браузера.';
      }

      if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        return 'Не удалось найти подходящую камеру на устройстве.';
      }
    }

    if (!capabilities.barcodeDetector) {
      return 'Камера может открыться, но автоматическое распознавание QR в этом браузере не поддерживается.';
    }

    return 'Не удалось открыть камеру для сканирования QR-кода.';
  }
}
