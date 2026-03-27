// PM2 configuration - keeps the bot running 24/7
module.exports = {
  apps: [{
    name: 'rental-assistant',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
