import { Functor } from '../../utils/Functor.js';

describe('Functor', () => {
  describe('constructor', () => {
    it('should create a Functor with the given value', () => {
      const functor = new Functor(5);
      expect(functor.getValue()).toBe(5);
    });
  });

  describe('map', () => {
    it('should apply the function to the value and return a new Functor', () => {
      const functor = new Functor(5);
      const result = functor.map(x => x * 2);
      expect(result).toBeInstanceOf(Functor);
      expect(result.getValue()).toBe(10);
    });
  });

  describe('mapAsync', () => {
    it('should apply the async function to the value and return a new Functor', async () => {
      const functor = new Functor(5);
      const asyncFn = jest.fn().mockResolvedValue(10);
      const result = await functor.mapAsync(asyncFn);
      expect(result).toBeInstanceOf(Functor);
      expect(result.getValue()).toBe(10);
      expect(asyncFn).toHaveBeenCalledWith(5);
    });

    it('should handle rejected promises', async () => {
      const functor = new Functor(5);
      const error = new Error('Test error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      await expect(functor.mapAsync(asyncFn)).rejects.toThrow('Test error');
      expect(asyncFn).toHaveBeenCalledWith(5);
    });
  });

  describe('getValue', () => {
    it('should return the current value of the Functor', () => {
      const functor = new Functor('test');
      expect(functor.getValue()).toBe('test');
    });
  });
});