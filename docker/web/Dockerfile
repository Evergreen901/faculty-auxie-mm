FROM node:16

RUN mkdir /code
ADD . /code/
WORKDIR /code/packages/web
RUN yarn --cwd /code/packages/web install --network-timeout 100000
CMD yarn start
