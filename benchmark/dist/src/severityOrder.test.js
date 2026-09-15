"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const severityOrder_1 = require("./severityOrder");
describe('Task 5: severityOrder shared module', () => {
    it('defines the correct canonical severity ordering', () => {
        expect(severityOrder_1.SEVERITY_ORDER).toEqual(['high', 'warning', 'info']);
    });
    describe('severityRank', () => {
        it('assigns 0 to high, 1 to warning, 2 to info', () => {
            expect((0, severityOrder_1.severityRank)('high')).toBe(0);
            expect((0, severityOrder_1.severityRank)('warning')).toBe(1);
            expect((0, severityOrder_1.severityRank)('info')).toBe(2);
        });
    });
    describe('compareSeverity', () => {
        it('sorts high before warning', () => {
            expect((0, severityOrder_1.compareSeverity)('high', 'warning')).toBeLessThan(0);
        });
        it('sorts warning before info', () => {
            expect((0, severityOrder_1.compareSeverity)('warning', 'info')).toBeLessThan(0);
        });
        it('sorts high before info', () => {
            expect((0, severityOrder_1.compareSeverity)('high', 'info')).toBeLessThan(0);
        });
        it('returns 0 for equal severities', () => {
            expect((0, severityOrder_1.compareSeverity)('warning', 'warning')).toBe(0);
        });
    });
    describe('meetsOrExceeds', () => {
        it('returns true when candidate is higher severity than threshold', () => {
            expect((0, severityOrder_1.meetsOrExceeds)('high', 'warning')).toBe(true);
            expect((0, severityOrder_1.meetsOrExceeds)('warning', 'info')).toBe(true);
            expect((0, severityOrder_1.meetsOrExceeds)('high', 'info')).toBe(true);
        });
        it('returns true when candidate is equal to threshold', () => {
            expect((0, severityOrder_1.meetsOrExceeds)('warning', 'warning')).toBe(true);
            expect((0, severityOrder_1.meetsOrExceeds)('high', 'high')).toBe(true);
            expect((0, severityOrder_1.meetsOrExceeds)('info', 'info')).toBe(true);
        });
        it('returns false when candidate is lower severity than threshold', () => {
            expect((0, severityOrder_1.meetsOrExceeds)('warning', 'high')).toBe(false);
            expect((0, severityOrder_1.meetsOrExceeds)('info', 'warning')).toBe(false);
            expect((0, severityOrder_1.meetsOrExceeds)('info', 'high')).toBe(false);
        });
    });
});
