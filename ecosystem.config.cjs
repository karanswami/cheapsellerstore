module.exports = {
  apps: [
    {
      name: "drip-client-reseller",
      cwd: "/home/kscoder/dripclientofficial.dev",
      interpreter: "/usr/bin/node",
      script: "/usr/bin/npm",
      args: "run start",
      max_memory_restart: "1200M",
      env: {
        PORT: 3102,
        NODE_ENV: "production",
        PATH: "/usr/bin:/bin:/usr/local/bin",
        NODE_OPTIONS: "--max-old-space-size=1024",
        NEXT_PUBLIC_APP_URL: "https://dripclientofficial.dev",
      },
    },
  ],
};
