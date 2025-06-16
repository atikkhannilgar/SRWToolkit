FROM node:20-alpine

WORKDIR /app

# copy only package.json and yarn.lock since the code is mounted as a volume
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

EXPOSE 5001

CMD ["yarn", "start"] 