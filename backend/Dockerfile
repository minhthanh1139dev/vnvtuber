# Use official Node.js lightweight Alpine image
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production

# Set working directory inside container
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies only (clean install)
RUN npm ci --only=production

# Copy application source code and scripts
COPY src/ ./src
COPY scripts/ ./scripts
COPY data/ ./data

# Expose the Express server port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
