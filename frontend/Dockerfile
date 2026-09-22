# Development image for the React frontend.
# The code is mounted from the host, so Vite reloads the page when a file
# changes. node_modules lives in a Docker volume (see compose.yaml), which
# keeps installs fast on Windows and macOS.
FROM node:22-alpine

WORKDIR /app

# Copy only the manifests first: this layer is rebuilt only when a
# dependency changes, not on every code change.
COPY package.json package-lock.json* ./

RUN npm install

COPY . .

EXPOSE 5173

# --host makes the dev server reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
