module.exports = {
  apps: [
    {
      name: 'leazo-backend',
      script: './dist/index.js',
      instances: 'max', // Utilizes all available CPU cores
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M' // Restarts if memory exceeds this limit (good for low-RAM instances)
    }
  ]
};
