/**
The default logger logs only `error` and `warn` to console. To provide custom logging from Permissions:

  - implement `IPermissionsLogger` methods (or just create a plain JS object with these)

  - pass an instance to [`setLogger()`](/miscellaneous/variables.html#setLogger)

 ```js
  import { setLogger, IPermissionsLogger } from '@superawesome/permissions'

  class MyLogger implements IPermissionsLogger {
    error(message: string, data?: any) {
      console.error(message, data);
    },
    ...
  }

  setLogger(new MyLogger());

  // internally its used like this

  getLogger().warn('Something smelly!', {data: 'to prove it'})

  // but you only really need it if you develop a plugin etc

 ```

 To disable logging completely:

 ```js
  setLogger(null);

 ```
 */
export interface IPermissionsLogger {
  error(message: string, data?: any): void;

  warn(message: string, data?: any): void;

  debug(message: string, data?: any): void;
}

/**
 * @internal
 */
class SADefaultLogger implements IPermissionsLogger {
  error(message: string, data?: any) {
    console.error(`SA-Permissions ERROR: ${message}`, data);
  }

  warn(message: string, data?: any) {
    console.log(`SA-Permissions WARNING: ${message}`, data);
  }

  debug(message: string, data?: any) {}
}

/**
 * @internal
 */
const nullLogger = new (class SANullLogger implements IPermissionsLogger {
  error(message: string, data?: any) {}

  warn(message: string, data?: any) {}

  debug(message: string, data?: any) {}
})();

/**
 * @internal
 */
let logger = new SADefaultLogger();

/**
 * Set a **global** logger ([IPermissionsLogger](/interfaces/IPermissionsLogger.html)) used by the library, instead of the console built in one.
 *
 * Use `setLogger(null)` to disable it.
 *
 * See [IPermissionsLogger](/interfaces/IPermissionsLogger.html)
 */
export const setLogger = <T extends IPermissionsLogger>(l: T | null): IPermissionsLogger =>
  (logger = l);

/**
 * Gives you the global logger so you can log eg `getLogger().warn('Something fishy!')`
 *
 * See [IPermissionsLogger](/interfaces/IPermissionsLogger.html)
 */
export const getLogger = (): IPermissionsLogger => logger || nullLogger;
