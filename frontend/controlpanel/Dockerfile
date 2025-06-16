FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./

# copy only package.json and yarn.lock since the code is mounted as a volume
RUN yarn install --frozen-lockfile

EXPOSE 3001

CMD ["yarn", "start"] 