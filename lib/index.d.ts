import { LayoutFunction } from "log4js";

/**
 * Configuration object for Yandex Cloud Logging Appender
 */
export interface YandexCloudLoggingConfig {
    serviceAccountID: string;
    keyID: string;
    keyData: string;
    destination: string;
    timeout?: number; // Timeout in milliseconds
    resourceId?: string;
    setCategoryAsResourceType?: boolean;
}

/**
 * ycAppender function that creates a logging appender for Yandex Cloud
 *
 * @param config - Yandex Cloud configuration
 * @param layout - Layout function for formatting log messages
 * @returns A function to process logging events
 */
export function ycAppender(
    config: YandexCloudLoggingConfig,
    layout: LayoutFunction
): (loggingEvent: any) => void & { shutdown: (cb: () => void) => void };

/**
 * configure function to create a new appender instance
 *
 * @param config - Yandex Cloud Logging configuration
 * @param layouts - Layout definitions provided by log4js
 * @returns A configured ycAppender instance
 */
export function configure(
    config: YandexCloudLoggingConfig,
    layouts: {
        messagePassThroughLayout: LayoutFunction;
        layout: (type: string, config: any) => LayoutFunction;
    }
): ReturnType<typeof ycAppender>;

declare module "log4js-node-yandex-cloud-logging" {
    export { ycAppender, configure, YandexCloudLoggingConfig };
}
