module.exports = {
  apps: [
    {
      name: 'saferoute-api',
      cwd: './apps/api',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s'
    },
    {
      name: 'saferoute-gps',
      cwd: './apps/gps-service',
      script: 'go',
      args: 'run main.go',
      watch: false,
      autorestart: true
    },
    {
      name: 'saferoute-admin',
      cwd: './apps/admin',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true
    }
  ]
};
