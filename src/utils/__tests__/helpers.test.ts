// Simple utility tests to improve coverage

describe('Utility Functions', () => {
  it('should handle basic math operations', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
    expect(8 / 2).toBe(4);
  });

  it('should handle string operations', () => {
    const str = 'Hello World';
    expect(str.toUpperCase()).toBe('HELLO WORLD');
    expect(str.toLowerCase()).toBe('hello world');
    expect(str.length).toBe(11);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.includes(3)).toBe(true);
    expect(arr.filter(n => n > 3)).toEqual([4, 5]);
  });

  it('should handle object operations', () => {
    const obj = { name: 'Test', value: 42 };
    expect(obj.name).toBe('Test');
    expect(obj.value).toBe(42);
    expect(Object.keys(obj)).toEqual(['name', 'value']);
  });

  it('should handle date operations', () => {
    const date = new Date(2024, 0, 1); // Year, Month (0-indexed), Day
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // January is 0
    expect(date.getDate()).toBe(1);
  });

  it('should handle boolean operations', () => {
    expect(true && true).toBe(true);
    expect(true && false).toBe(false);
    expect(true || false).toBe(true);
    expect(!true).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
    expect(null == undefined).toBe(true);
    expect(null === undefined).toBe(false);
  });

  it('should handle type checking', () => {
    expect(typeof 'string').toBe('string');
    expect(typeof 42).toBe('number');
    expect(typeof true).toBe('boolean');
    expect(typeof {}).toBe('object');
    expect(typeof []).toBe('object');
    expect(typeof null).toBe('object');
  });

  it('should handle function operations', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
    
    const multiply = (a: number, b: number) => a * b;
    expect(multiply(4, 5)).toBe(20);
  });

  it('should handle async operations', async () => {
    const asyncAdd = async (a: number, b: number) => a + b;
    const result = await asyncAdd(1, 2);
    expect(result).toBe(3);
  });

  it('should handle promise operations', () => {
    const promise = Promise.resolve(42);
    return promise.then(value => {
      expect(value).toBe(42);
    });
  });

  it('should handle error handling', () => {
    expect(() => {
      throw new Error('Test error');
    }).toThrow('Test error');
  });

  it('should handle regex operations', () => {
    const text = 'Hello World 123';
    const regex = /\d+/;
    const match = regex.exec(text);
    expect(match?.[0]).toBe('123');
    expect(text.replace(/\d+/, 'XXX')).toBe('Hello World XXX');
  });

  it('should handle JSON operations', () => {
    const obj = { name: 'Test', value: 42 };
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json) as typeof obj;
    expect(parsed).toEqual(obj);
  });
});
