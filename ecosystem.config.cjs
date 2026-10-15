module.exports = {
  apps: [
    {
      name: "cheapsellerstore",
      cwd: "/home/kscoder/cheapsellerstore",
      interpreter: "/usr/bin/node",
      script: "/usr/bin/npm",
      args: "run start",
      max_memory_restart: "1200M",
      env: {
        PORT: 3120,
        NODE_ENV: "production",
        PATH: "/usr/bin:/bin:/usr/local/bin",
        NODE_OPTIONS: "--max-old-space-size=1024",
        NEXT_PUBLIC_APP_URL: "https://cheapseller.store",
      },
    },
  ],
};
