# rollup-plugin-espruino-modules

Espruino Rollup Support


`rollup.config.js` use

```
import { buildEspruinoConfig } from 'rollup-plugin-espruino-modules';

export default buildEspruinoConfig({
  input: 'src/entry.js',
  output: {
    file: 'bundle.js',
  },
  espruino: {
    board: 'ESP8266_4MB'
  }
});
```
