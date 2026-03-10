/**
 * Unit tests for WebSocketService.
 */
describe('WebSocketService', () => {
  let websocketService;

  beforeEach(() => {
    jest.resetModules();
    websocketService = require('../../src/services/websocketService');
  });

  it('should not throw when emitting without init', () => {
    expect(() => websocketService.emitNewOrder({ id: 1 })).not.toThrow();
    expect(() => websocketService.emitOrderStatusChange({ id: 1 })).not.toThrow();
    expect(() => websocketService.emitNewReservation({ id: 1 })).not.toThrow();
    expect(() => websocketService.emitReservationStatusChange({ id: 1 })).not.toThrow();
    expect(() => websocketService.emitInvoiceEvent('created', { id: 1 })).not.toThrow();
    expect(() => websocketService.emitNotification('test')).not.toThrow();
    expect(() => websocketService.emitDashboardRefresh()).not.toThrow();
  });

  it('should have null io before init', () => {
    expect(websocketService.io).toBeNull();
  });
});
