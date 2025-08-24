FROM node as development

WORKDIR /app

RUN npm i -g nodemon
# good practice : for add cache
COPY package.json package-lock.json ./

# npm ci fast and more reliable
RUN npm ci

# copy all files
COPY . .

EXPOSE 5000
# start the application ind development mode , in production mode use npm run start:prod
CMD ["npm", "run", "start:dev"]

FROM node as production

WORKDIR /app

# good practice : for add cache
COPY package.json package-lock.json ./

# npm ci fast and more reliable
RUN npm ci

# copy all files
COPY . .

EXPOSE 5000
# start the application ind development mode , in production mode use npm run start:prod
CMD ["npm", "run", "start:prod"]