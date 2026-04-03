/**
 * Глубокое клонирование объекта
 * @param obj - объект для клонирования
 * @returns клон объекта
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
    if (obj instanceof Map) {
        const map = new Map();
        obj.forEach((value, key) => map.set(deepClone(key), deepClone(value)));
        return map as any;
    }
    if (obj instanceof Set) {
        const set = new Set();
        obj.forEach(value => set.add(deepClone(value)));
        return set as any;
    }
    
    const clonedObj = {} as T;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
};

/**
 * Проверяет, пуст ли объект
 * @param obj - объект для проверки
 * @returns true если пуст
 */
export const isEmptyObject = (obj: Record<string, any>): boolean => {
    return Object.keys(obj).length === 0;
};

/**
 * Очищает объект от undefined и null значений
 * @param obj - исходный объект
 * @returns очищенный объект
 */
export const cleanObject = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const result: Partial<T> = {};
    for (const key in obj) {
        if (obj[key] !== undefined && obj[key] !== null) {
            result[key] = obj[key];
        }
    }
    return result;
};

/**
 * Выбирает указанные поля из объекта
 * @param obj - исходный объект
 * @param keys - массив ключей для выбора
 * @returns объект с выбранными полями
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};

/**
 * Исключает указанные поля из объекта
 * @param obj - исходный объект
 * @param keys - массив ключей для исключения
 * @returns объект без исключённых полей
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};