const {Destination} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_entry");
const {WriteRequest} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_ingestion_service");
const {LogEntryResource} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_resource");
const {
    IncomingLogEntry,
    LogLevel_Level
} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_entry");
const {LogIngestionServiceClient} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/service_clients");
const debug = require('debug')('log4js:yandex-cloud-logging');
const {Session} = require('@yandex-cloud/nodejs-sdk');

class YC {
    queue = {};
    intervalId = null;

    constructor(serviceAccountId, accessKeyId, privateKey, destination, timeout, resourceId, setCategoryAsResourceType) {
        this.serviceAccountID = serviceAccountId;
        this.keyID = accessKeyId;
        this.keyData = privateKey;
        this.destination = destination;
        this.timeout = timeout;
        this.cloudService = null;
        this.resourceId = resourceId;
        this.setCategoryAsResourceType = setCategoryAsResourceType;

        const session = new Session({serviceAccountJson: {serviceAccountId, accessKeyId, privateKey}});
        this.cloudService = session.client(LogIngestionServiceClient);
        debug(`cloudService initiated`);

        this.start();

        if (!this.serviceAccountID) debug('No Service Account ID provided');
        if (!this.keyID) debug('No Service Key ID provided');
        if (!this.keyData) debug('No Key data provided');
    }

    start() {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => {
            this._sendQueue();
        }, this.timeout);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    mapLevel(level) {
        const levelStr = level && level.levelStr ? level.levelStr : "";
        switch (levelStr) {
            case "ALL":
                return LogLevel_Level.LEVEL_UNSPECIFIED;
            case "MARK":
                return LogLevel_Level.UNRECOGNIZED;
            case "TRACE":
                return LogLevel_Level.TRACE;
            case "DEBUG":
                return LogLevel_Level.DEBUG;
            case "INFO":
                return LogLevel_Level.INFO;
            case "WARN":
                return LogLevel_Level.WARN;
            case "ERROR":
                return LogLevel_Level.ERROR;
            case "FATAL":
                return LogLevel_Level.FATAL;
            case "OFF":
                return LogLevel_Level.LEVEL_UNSPECIFIED;
            default:
                return LogLevel_Level.UNRECOGNIZED;
        }
    }

    _sendQueue() {
        const currentQueue = this.queue;
        this.queue = {};

        Object.entries(currentQueue).forEach(([key, data]) => {
            this._sendElement(data).then(() => {
                debug(`Successfully sent ${data.lines.length} logs from queue for resource ${key}`);
            }).catch((err) => {
                debug(`Failed to send logs for resource ${key}: ${err.message}`);
            });
        });
    }

    _sendElement(data) {
        const resource = {};
        if (this.resourceId !== undefined) {
            resource.id = this.resourceId;
        }
        if (this.setCategoryAsResourceType) {
            resource.type = this._transformResource(data.resource);
        }

        const entries = data.lines.map(line => {
            const entry = {
                timestamp: line.startTime,
                level: this.mapLevel(line.level)
            };

            const formattedMessage = data.layout(line);
            
            try {
                // Если все сообщение - валидный JSON
                const parsed = JSON.parse(formattedMessage);
                if (typeof parsed === 'object' && parsed !== null) {
                    entry.jsonPayload = parsed;
                } else {
                    entry.message = formattedMessage;
                }
            } catch (e) {
                // Если не JSON, ищем JSON внутри строки (например: "Text {json}")
                const jsonMatch = formattedMessage.match(/^([^{]*)\s*({.*})\s*$/);
                if (jsonMatch) {
                    const text = jsonMatch[1].trim();
                    const jsonPart = jsonMatch[2];
                    try {
                        const parsed = JSON.parse(jsonPart);
                        if (text) entry.message = text;
                        entry.jsonPayload = parsed;
                    } catch (e2) {
                        entry.message = formattedMessage;
                    }
                } else {
                    entry.message = formattedMessage;
                }
            }

            return IncomingLogEntry.fromPartial(entry);
        });

        return this.cloudService.write(WriteRequest.fromPartial({
            destination: Destination.fromPartial({logGroupId: this.destination}),
            resource: LogEntryResource.fromPartial(resource),
            entries
        })).catch((err) => {
            debug(`Error sending log entries: ${err.message}`);
            throw err;
        });
    }

    _transformResource(name = "") {
        return this._replaceAll(name.replace(/[^-a-zA-Z0-9_.]/g, '-'), ":", "-")
    }

    _replaceAll(str, find, replace) {
        return str.replace(new RegExp(find, 'g'), replace);
    }

    write(data) {
        if (!data.resource) return;
        
        if (this.queue[data.resource]) {
            this.queue[data.resource].lines.push(...data.lines);
        } else {
            this.queue[data.resource] = {
                resource: data.resource,
                layout: data.layout,
                lines: [...data.lines]
            };
        }
    }
}

module.exports = YC;