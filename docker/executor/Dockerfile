FROM node:16

RUN mkdir /code
ADD . /code/
WORKDIR /code/packages/executor
RUN npm install typescript --global  \
  && yarn --cwd /code install \
  && yarn install
CMD yarn run build && yarn run app-dev
