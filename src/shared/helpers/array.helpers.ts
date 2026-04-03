export function unique<T>(array: T[]): T[] {
    return [...new Set(array)];
}

export function groupBy<T>(array: T[], key: keyof T): Map<T[keyof T], T[]> {
    const map = new Map<T[keyof T], T[]>();
    
    array.forEach(item => {
        const groupKey = item[key];
        if (!map.has(groupKey)) {
            map.set(groupKey, []);
        }
        const group = map.get(groupKey);
        if (group) {
            group.push(item);
        }
    });
    
    return map;
}

export function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i] as T;
        result[i] = result[j] as T;
        result[j] = temp;
    }
    return result;
}

export function chunk<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export function intersection<T>(array1: T[], array2: T[]): T[] {
    const set2 = new Set(array2);
    return array1.filter(item => set2.has(item));
}

export function difference<T>(array1: T[], array2: T[]): T[] {
    const set2 = new Set(array2);
    return array1.filter(item => !set2.has(item));
}

export function sortBy<T>(array: T[], key: keyof T, ascending: boolean = true): T[] {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

/**
 * Получить случайный элемент из массива
 */
export function randomItem<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Разделить массив на две части по предикату
 */
export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const pass: T[] = [];
    const fail: T[] = [];
    
    array.forEach(item => {
        if (predicate(item)) {
            pass.push(item);
        } else {
            fail.push(item);
        }
    });
    
    return [pass, fail];
}