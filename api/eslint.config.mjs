// @ts-check

// Imports necessários
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Polyfill para __dirname que já confirmamos ser necessário
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Exporta a configuração "flat config"
export default tseslint.config(
  // 1. Configurações Globais
  {
    // Ignora a pasta de build e o próprio arquivo de configuração
    ignores: ['dist/', 'eslint.config.mjs'],
  },
  {
    // Aplica a todos os arquivos
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // 2. Configurações para TODOS os arquivos .js e .ts (sem análise de tipo)
  eslint.configs.recommended,
  ...tseslint.configs.recommended, // Regras básicas do TS-ESLint
  eslintPluginPrettierRecommended, // Integração com Prettier

  // 3. Bloco de configuração APENAS para arquivos TypeScript com ANÁLISE DE TIPO
  //    Esta é a parte mais importante e a que estamos corrigindo.
  {
    files: ['src/**/*.ts'], // Aplica este bloco apenas aos arquivos .ts na pasta src
    extends: [
      // Carrega as configurações que PRECISAM de informações de tipo
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: true, // Diz para encontrar o tsconfig.json
        tsconfigRootDir: __dirname, // Define a raiz para a busca
      },
    },
    rules: {
      // Suas regras personalizadas que podem ou não depender de tipos
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // As regras no-unsafe-* (assignment, call, etc.) são ativadas pelo
      // 'recommendedTypeChecked' e não precisam ser declaradas aqui.
    },
  },
);
