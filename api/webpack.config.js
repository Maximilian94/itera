// api/webpack.config.js
const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = function (options) {
  return {
    ...options, // Isso mantém todas as configurações padrão do NestJS que já funcionam
    resolve: {
      ...options.resolve,
      // Aqui é onde a mágica acontece:
      plugins: [
        // Adicionamos nosso plugin à lista de plugins que o Webpack usa para resolver caminhos
        ...(options.resolve.plugins || []),
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, 'tsconfig.json'),
        }),
      ],
    },
  };
};
