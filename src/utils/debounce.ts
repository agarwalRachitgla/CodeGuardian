/**
 * CodeGuardian AI - Debounce Utility
 * 
 * Provides a debounce function to limit the rate of function calls,
 * particularly for real-time document analysis.
 */

/**
 * Creates a debounced version of the provided function that delays
 * invoking the function until after `delay` milliseconds have elapsed
 * since the last time the debounced function was called.
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>): void {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func.apply(this, args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Creates a throttled version of the provided function that only
 * invokes the function at most once per `interval` milliseconds.
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    interval: number
): (...args: Parameters<T>) => void {
    let lastCallTime: number = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>): void {
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime;

        if (timeSinceLastCall >= interval) {
            lastCallTime = now;
            func.apply(this, args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastCallTime = Date.now();
                timeoutId = null;
                func.apply(this, args);
            }, interval - timeSinceLastCall);
        }
    };
}
