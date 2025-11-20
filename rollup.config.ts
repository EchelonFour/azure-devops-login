// See: https://rollupjs.org/introduction/
import { defineConfig } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = defineConfig({
  input: 'src/index.ts',
  output: {
    esModule: true,
    dir: 'dist',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    typescript({
      exclude: ['coverage', 'dist', 'node_modules', '**/*.test.ts', '__fixtures__'],
      include: ['src/**/*.ts'],
    }),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
  ],
})

export default config
