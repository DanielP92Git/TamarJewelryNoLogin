require('dotenv').config();

const config = {
  mongodb: {
    url: process.env.MONGO_URL || 'mongodb://localhost:27017/jewelry',
    options: {}
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
