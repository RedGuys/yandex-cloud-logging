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

    constructor(serviceAccountId, accessKeyId, privateKey, destination, timeout, resourceId, setCategoryAsResourceType) {
        this.serviceAccountID = serviceAccountId;
        this.keyID = accessKeyId;
        this.keyData = privateKey;
        this.destination = destination;
        this.timeout = timeout;
        this.cloudService = null;
        this.resourceId = resourceId;
        this.setCategoryAsResourceType = setCategoryAsResourceType;
        const session = new Session({serviceAccountJson: {serviceAccountId,accessKeyId,privateKey}});
        this.cloudService = session.client(LogIngestionServiceClient);
        debug(`cloudService initiated`)
        setInterval(() => {this._sendQueue();},timeout);

        if (!this.serviceAccountID) debug('No Service Account ID provided');
        if (!this.keyID) debug('No Service Key ID provided');
        if (!this.keyData) debug('No Key data provided');
    }

    mapLevel(level) {
        switch (level.levelStr) {
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
        for (let key in this.queue) {
            if (!this.queue.hasOwnProperty(key)) continue;
            let data = this.queue[key];
            delete this.queue[key];
            this._sendElement(data);
            debug(`Sending ${data.lines.length} logs from queue`)
        }
    }

    _sendElement(data) {
        return new Promise((resolve, reject) => {
            let resource = {};
            if(this.resourceId!==undefined) {
                resource.id = this.resourceId;
            }
            if(this.setCategoryAsResourceType) {
                resource.type = this._transformResource(data.resource);
            }
            this.cloudService.write(WriteRequest.fromPartial({
                destination: Destination.fromPartial({logGroupId: this.destination}),
                resource: LogEntryResource.fromPartial(resource),
                entries: data.lines.map(line => IncomingLogEntry.fromPartial({
                    message: data.layout(line),
                    timestamp: line.startTime,
                    level: this.mapLevel(line.level)
                }))
            })).then((res) => {
                resolve(res);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    _transformResource(name= "") {
        return this._replaceAll(name.replace(/[^-a-zA-Z0-9_.]/g, '-'), ":", "-")
    }

    _replaceAll(str, find, replace) {
        return str.replace(new RegExp(find, 'g'), replace);
    }

    write(data) {
        if (this.queue[data.resource]) {
            for (let line of data.lines) {
                this.queue[data.resource].lines.push(line);
            }
        } else {
            this.queue[data.resource] = data;
        }
    }
}

module.exports = YC;