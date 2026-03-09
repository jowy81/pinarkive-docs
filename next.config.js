const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
  unstable_defaultShowCopyCode: true,
})

module.exports = withNextra({
  reactStrictMode: true,
})
