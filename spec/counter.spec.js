'use strict';

/*jshint -W003 */

var Client = require('../lib/client');

var udpServer = require('./tools/udp-server');
var logger = require('bunyan').createLogger({name: 'tests'});

var expect = require('chai').expect;

describe('When sending counter metrics', function () {

    var udpPort = Math.floor(Math.random() * 10000) + 1000;

    var victim = new Client({
        systemStats: false,
        transport: 'udp',
        port: udpPort,
        flushSize: 1
    }, logger);

    it('should send simple counter with defaults', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.counter('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric \d+ \d+ sum,count,10$/);
            done();
        }
    });

    it('should send counter with custom aggregations', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.counter('my_metric', 1, {}, ['avg']);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric 1 \d+ sum,count,avg,10$/);
            done();
        }
    });

    it('should send counter with custom tags', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.counter('my_metric', 1, {cluster: 'test'});

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric,cluster=test 1 \d+ sum,count,10$/);
            done();
        }
    });

    it('should send counter with custom aggregation frequency', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.counter('my_metric', 1, {}, null, 100);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric 1 \d+ sum,count,100$/);
            done();
        }
    });

    it('should configure default tags for counters', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    tags: {cluster: 'test'}
                }
            }
        }, logger);

        // When
        victim.counter('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric,cluster=test 1 \d+ sum,count,10$/);
            done();
        }
    });

    it('should merge default counter tags', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    tags: { env: 'qa' }
                }
            }
        }, logger);

        // When
        victim.counter('my_metric', 1, {cluster: 'test'});

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric,cluster=test,env=qa 1 \d+ sum,count,10$/);
            done();
        }
    });

    it('should configure default aggregations for counters', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    agg: ['sum']
                }
            }
        }, logger);

        // When
        victim.counter('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric 1 \d+ sum,10$/);
            done();
        }
    });


    it('should configure default aggregation frequency for counters', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    aggFreq: 100
                }
            }
        }, logger);

        // When
        victim.counter('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric 1 \d+ sum,count,100$/);
            done();
        }
    });

    it('should override default counter aggregation frequency', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    aggFreq: 99
                }
            }
        }, logger);

        // When
        victim.counter('my_metric', 1, null, null, 100);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric 1 \d+ sum,count,100$/);
            done();
        }
    });

    it('should merge unique aggregations', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1
        }, logger);

        // When
        victim.counter('my_metric', 1, {}, ['sum']);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric 1 \d+ sum,count,10$/);
            done();
        }
    });

    it('should handle empty default counter config', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: { counter: {}}
        }, logger);

        // When
        victim.counter('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.counter.my_metric 1 \d+ sum,count,10$/);
            done();
        }
    });
});