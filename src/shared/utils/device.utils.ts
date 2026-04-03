/**
 * Проверяет, является ли устройство мобильным
 * @returns true если мобильное устройство
 */
export const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Проверяет, является ли устройство планшетом
 * @returns true если планшет
 */
export const isTablet = (): boolean => {
    return isMobile() && window.innerWidth >= 768 && window.innerHeight >= 768;
};

/**
 * Проверяет, является ли устройство десктопом
 * @returns true если десктоп
 */
export const isDesktop = (): boolean => {
    return !isMobile();
};

/**
 * Получает ориентацию экрана
 * @returns 'portrait' или 'landscape'
 */
export const getOrientation = (): 'portrait' | 'landscape' => {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};

/**
 * Получает тип устройства
 * @returns 'mobile', 'tablet' или 'desktop'
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
    if (isTablet()) return 'tablet';
    if (isMobile()) return 'mobile';
    return 'desktop';
};