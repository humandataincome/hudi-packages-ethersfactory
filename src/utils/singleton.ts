export const SINGLETON_KEY = Symbol();

export type Singleton<T extends new (...args: unknown[]) => unknown> = T & {
  [SINGLETON_KEY]: T extends new (...args: unknown[]) => infer I ? I : never
}
export const singleton = <T extends new (...args: unknown[]) => unknown>(classTarget: T): T =>
  new Proxy(classTarget, {
    construct(target: Singleton<T>, argumentsList, newTarget) {
      // Skip proxy for children
      if (target.prototype !== newTarget.prototype) {
        return Reflect.construct(target, argumentsList, newTarget);
      }
      if (!target[SINGLETON_KEY]) {
        target[SINGLETON_KEY] = Reflect.construct(target, argumentsList, newTarget);
      }
      return target[SINGLETON_KEY];
    },
  });
