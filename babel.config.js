module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ts', '.tsx', '.js', '.json'],
          alias: {
            '@components': './app/components',
            '@screens': './app/screens',
            '@hooks': './app/hooks',
            '@utils': './app/utils',
            '@config': './app/config',
            '@constants': './app/constants',
            '@theme': './app/theme',
            '@tasks': './app/tasks',
            '@context': './app/context',
          },
        },
      ],
    ],
  };
};
