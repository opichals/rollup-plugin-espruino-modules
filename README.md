## Espruino Rollup Support *rollup-plugin-espruino-modules*

Use from `rollup.config.js` use

```
import { buildRollupConfig } from 'rollup-plugin-espruino-modules';

export default buildRollupConfig({
  input: 'src/entry.js',
  output: {
    file: 'bundle.js',
  },
  espruino: {
    board: 'ESP8266_4MB'
  }
});
```
