import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    './src/index.ts',
    // 'src/lib/index.ts',
    // 'src/utils/index.ts',
    // 'src/hooks/index.ts',
    // 'src/constants/index.ts',
  ],
  format: ['esm'],
  dts: {
    entry: 'src/index.ts',
    resolve: true,
    compilerOptions: {
      moduleResolution: 'node10',
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    },
  },
  clean: true,
  // sourcemap: true,
  minify: true, // keep readable for internal use
  outDir: 'dist',
  splitting: false,
  keepNames: true,
  treeshake: true,
  external: ['react', 'react-dom', 'react-router-dom'],
  onSuccess: 'copyfiles -u 1 "src/styles/**/*.css" dist',
  ignoreWatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', 'src/__tests__'],
  target: 'es2020',
});
