export default {
  // Windsurfer specific configuration
  components: {
    NewsletterEngine: {
      type: 'application',
      framework: 'react',
      dependencies: {
        '@mantine/core': '^6.0.0',
        '@mantine/notifications': '^6.0.0'
      }
    }
  },
  deployment: {
    type: 'nodejs',
    port: 3000,
    database: 'sqlite'
  }
};
