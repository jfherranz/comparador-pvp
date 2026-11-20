// Completa app.json. En GitHub Pages la app vive en /<repositorio>, así que la
// publicación define EXPO_BASE_URL (ver .github/workflows/publicar.yml). En local no se usa.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
