# Base image: node:20-alpine (Minimalist version, ~5x lighter)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies
# This skips devDependencies, saving space and install time
RUN npm install --omit=dev

# Set environment to production
# This tells many Node.js tools (like Express) to run in optimized mode
ENV NODE_ENV=production

# Copy the rest of the application code
COPY . .

# Expose the port defined in package.json start script (3001)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
