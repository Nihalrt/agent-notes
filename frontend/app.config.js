// A dynamic config (rather than a static app.json) so the GitHub Pages
// subpath ("/agent-notes") only applies during the CI export for Pages —
// local dev (`expo start --web`) still serves from "/" as before.
module.exports = ({ config }) => ({
  ...config,
  name: "agent-notes",
  slug: "agent-notes",
  experiments: {
    ...(config.experiments || {}),
    baseUrl: process.env.GITHUB_PAGES_BUILD ? "/agent-notes" : "",
  },
});
