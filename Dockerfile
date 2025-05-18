FROM node:18-alpine
# install curl
RUN apk add --no-cache curl
# Create and set the app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Argument for environment
ARG ENV

# Fail the build if ENV is not provided
RUN if [ -z "$ENV" ]; then echo "ENV build argument is required" && exit 1; fi

# Copy environment-specific env file
COPY env/${ENV}/.env .env

# Copy the rest of the application
COPY . .

# Build the TypeScript code
RUN npm run build

# Remove environment files after build
RUN rm -rf env

# Expose the port the app runs on
EXPOSE 9009

# Command to run the app
CMD [ "node", "dist/app.js" ]
